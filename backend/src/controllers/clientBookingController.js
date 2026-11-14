import crypto from "crypto";
import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Table from "../models/table.js";
import Booking from "../models/booking.js";
import Waitlist from "../models/waitlist.js";
import { notifyBranchAdmins } from "../services/notifications.js";
import { POINT_VALUE, maxRedeemablePoints, redeemPoints, restorePoints } from "../services/loyalty.js";
import { discardUpload } from "../middleware/upload.js";
import { parsePayment, sendPaymentProof, serializePaymentAccount, serializePaymentSnapshot, snapshotPaymentAccount } from "../utils/payments.js";
import { formatBranchName } from "../utils/branchName.js";

export const MAX_BOOKING_DAYS = 30;
const ALLOWED_DURATIONS = [1, 2, 3];
const BUSY_STATUSES = ["pending", "approved"];
const ACTIVE_WAITLIST_STATUSES = ["waiting", "notified"];
const MAX_WAITLIST_ENTRIES = 5;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// share of the booking total paid upfront with the payment proof
const ADVANCE_RATE = 0.5;
const getAdvanceAmount = (total) => Math.ceil(total * ADVANCE_RATE);

// total after any loyalty points spent on the booking
const bookingTotal = (hourlyRate, duration, pointsUsed = 0) => Math.max(hourlyRate * duration - pointsUsed * POINT_VALUE, 0);

const DEFAULT_OPENING_TIME = 12 * 60;
const DEFAULT_CLOSING_TIME = 26 * 60;

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toDateKey = (date) => date.toISOString().slice(0, 10);

const toUtcDate = (dateKey) => {
    if (!DATE_KEY.test(dateKey)) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) || toDateKey(date) !== dateKey ? null : date;
};

const todayKey = () => toDateKey(new Date());

const addDays = (dateKey, days) => {
    const date = toUtcDate(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return toDateKey(date);
};

const slotHasStarted = (dateKey, startTime) => {
    const date = toUtcDate(dateKey);
    return new Date(date.getTime() + startTime * 60 * 1000) <= new Date();
};

const hoursFrom = (branch) => {
    const openingTime = Number(branch?.openingTime);
    const closingTime = Number(branch?.closingTime);
    return {
        openingTime: Number.isFinite(openingTime) ? openingTime : DEFAULT_OPENING_TIME,
        closingTime: Number.isFinite(closingTime) ? closingTime : DEFAULT_CLOSING_TIME
    };
};

const serializeBranch = (branch, tables = []) => ({
    id: String(branch._id),
    name: formatBranchName(branch),
    code: branch.branchCode,
    paymentAccounts: (branch.paymentAccounts || []).map(serializePaymentAccount),
    ...hoursFrom(branch),
    tableCount: tables.length,
    availableCount: tables.filter((table) => table.status === "available").length
});

const serializeTable = (table) => ({
    id: String(table._id),
    name: table.name,
    type: table.tableType,
    status: table.status,
    pricePerHour: table.pricePerHour,
    frameRate: table.frameRate,
    centuryRate: table.centuryRate
});

const REMOVED_TABLE = { name: "Removed table", tableType: null };

const serializeBooking = (booking) => {
    // the table may have been deleted by the club after the booking was made
    const table = booking.table || REMOVED_TABLE;
    const branch = booking.branchId;

    return {
        reference: booking.reference,
        branchId: String(branch._id || branch),
        branchName: branch.branchName ? formatBranchName(branch) : "",
        tableId: table._id ? String(table._id) : null,
        tableName: table.name,
        tableType: table.tableType,
        date: toDateKey(booking.date),
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
        hourlyRate: booking.hourlyRate,
        subtotal: booking.hourlyRate * booking.duration,
        loyaltyPointsUsed: booking.loyaltyPointsUsed,
        loyaltyDiscount: booking.loyaltyPointsUsed * POINT_VALUE,
        total: booking.totalAmount,
        advanceAmount: booking.advanceAmount,
        remainingAmount: Math.max(booking.totalAmount - booking.advanceAmount, 0),
        paymentAccount: serializePaymentSnapshot(booking.paymentAccount),
        transactionId: booking.transactionId,
        hasPaymentProof: Boolean(booking.paymentProof),
        paymentSubmittedAt: booking.paymentSubmittedAt,
        status: booking.status,
        cancellationReason: booking.cancellationReason,
        rejectionReason: booking.rejectionReason,
        cancelledAt: booking.cancelledAt
    };
};

const populateBooking = (query) => query
    .populate("table", "name tableType pricePerHour")
    .populate("branchId", "branchName branchCode openingTime closingTime");

const createReference = (dateKey) => {
    const stamp = dateKey.replaceAll("-", "");
    const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `CC-${stamp}-${suffix}`;
};

const loadBranch = async (branchId) => {
    if (!isObjectId(branchId)) return null;
    return Branch.findById(branchId);
};

const findOverlap = async ({ tableId, date, startTime, endTime, excludeReference }) => {
    const filter = {
        table: tableId,
        date,
        status: { $in: BUSY_STATUSES },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
    };

    if (excludeReference) {
        filter.reference = { $ne: excludeReference };
    }

    return Booking.findOne(filter);
};

const parseSchedule = (body, branchHours = { openingTime: DEFAULT_OPENING_TIME, closingTime: DEFAULT_CLOSING_TIME }) => {
    const dateKey = String(body.date || "").trim();
    const startTime = Number(body.startTime);
    const duration = Number(body.duration);
    const date = toUtcDate(dateKey);

    if (!date) {
        return { error: "A valid booking date is required" };
    }

    if (dateKey < todayKey() || dateKey > addDays(todayKey(), MAX_BOOKING_DAYS)) {
        return { error: `Bookings can only be made up to ${MAX_BOOKING_DAYS} days in advance` };
    }

    if (!ALLOWED_DURATIONS.includes(duration)) {
        return { error: "Duration must be 1, 2, or 3 hours" };
    }

    if (!Number.isInteger(startTime) || startTime < branchHours.openingTime || startTime % 60 !== 0) {
        return { error: "A valid start time is required" };
    }

    const endTime = startTime + duration * 60;
    if (endTime > branchHours.closingTime) {
        return { error: "This schedule falls outside club hours" };
    }

    if (slotHasStarted(dateKey, startTime)) {
        return { error: "This time slot has already started" };
    }

    return { date, dateKey, startTime, endTime, duration };
};

const formatClock = (minutes) => {
    const hour = Math.floor((minutes % 1440) / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const formatDay = (date) => date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

// waiting or notified entries whose slot has started are reported as expired
const waitlistStatus = (entry) => (
    ACTIVE_WAITLIST_STATUSES.includes(entry.status) && slotHasStarted(toDateKey(entry.date), entry.startTime)
        ? "expired"
        : entry.status
);

const serializeWaitlistEntry = (entry) => {
    const table = entry.table || REMOVED_TABLE;
    const branch = entry.branchId;

    return {
        id: String(entry._id),
        branchId: String(branch._id || branch),
        branchName: branch.branchName ? formatBranchName(branch) : "",
        tableId: table._id ? String(table._id) : null,
        tableName: table.name,
        tableType: table.tableType,
        date: toDateKey(entry.date),
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        status: waitlistStatus(entry),
        notifiedAt: entry.notifiedAt,
        createdAt: entry.createdAt
    };
};

const populateWaitlist = (query) => query
    .populate("table", "name tableType")
    .populate("branchId", "branchName branchCode openingTime closingTime");

// Tells every waiting client whose whole slot on this table is now free; the first to book gets it.
// Kept as a hook for booking lifecycle callers; waitlist notifications are sent manually by admins.
export const releaseSlot = async () => {};

const loadOwnedBooking = async (reference, userId) => {
    const booking = await populateBooking(Booking.findOne({
        reference: String(reference || "").toUpperCase(),
        user: userId
    }));
    return booking;
};

export const listBookingBranches = async (req, res) => {
    try {
        const branches = await Branch.find().sort({ branchName: 1 }).lean();
        const tables = await Table.find().select("branchId status").lean();
        const tablesByBranch = new Map();

        tables.forEach((table) => {
            const key = String(table.branchId);
            const group = tablesByBranch.get(key) || [];
            group.push(table);
            tablesByBranch.set(key, group);
        });

        res.status(200).json({
            branches: branches.map((branch) => serializeBranch(branch, tablesByBranch.get(String(branch._id)) || []))
        });
    } catch (error) {
        console.error("List booking branches error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listBranchTables = async (req, res) => {
    try {
        const branch = await loadBranch(req.params.branchId);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const tables = await Table.find({ branchId: branch._id }).sort({ name: 1 });
        res.status(200).json({
            branch: serializeBranch(branch, tables),
            tables: tables.map(serializeTable)
        });
    } catch (error) {
        console.error("List branch tables error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getBranchAvailability = async (req, res) => {
    try {
        const branch = await loadBranch(req.params.branchId);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const date = toUtcDate(String(req.query.date || "").trim());
        if (!date) {
            return res.status(400).json({ message: "A valid date is required" });
        }

        const tables = await Table.find({ branchId: branch._id }).select("_id");
        const bookings = await Booking.find({
            table: { $in: tables.map((table) => table._id) },
            date,
            status: { $in: BUSY_STATUSES },
            ...(req.query.exclude ? { reference: { $ne: String(req.query.exclude).toUpperCase() } } : {})
        }).select("table startTime endTime");

        res.status(200).json({
            busy: bookings.map((booking) => ({
                tableId: String(booking.table),
                startTime: booking.startTime,
                endTime: booking.endTime
            }))
        });
    } catch (error) {
        console.error("Branch availability error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listClientBookings = async (req, res) => {
    try {
        const bookings = await populateBooking(Booking.find({ user: req.user._id }).sort({ createdAt: -1 }));
        res.status(200).json({ bookings: bookings.map(serializeBooking) });
    } catch (error) {
        console.error("List client bookings error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getClientBooking = async (req, res) => {
    try {
        const booking = await loadOwnedBooking(req.params.reference, req.user._id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json({ booking: serializeBooking(booking) });
    } catch (error) {
        console.error("Get client booking error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// multipart request: booking fields plus `paymentAccountId`, `transactionId`, the `paymentProof` image,
// and optional `loyaltyPoints` to spend
export const createClientBooking = async (req, res) => {
    const fail = (status, message) => {
        discardUpload(req.file);
        return res.status(status).json({ message });
    };
    let redeemed = 0;

    try {
        const table = isObjectId(req.body.tableId) ? await Table.findById(req.body.tableId) : null;
        if (!table) {
            return fail(404, "Table not found");
        }

        if (table.status !== "available") {
            return fail(400, "This table is not available for booking");
        }

        const club = await Branch.findById(table.branchId);
        const schedule = parseSchedule(req.body, hoursFrom(club));
        if (schedule.error) {
            return fail(400, schedule.error);
        }

        const payment = await parsePayment(club, req.body);
        if (payment.error) {
            return fail(payment.status, payment.error);
        }

        if (!req.file) {
            return fail(400, "Upload a screenshot of your payment as proof");
        }

        const overlap = await findOverlap({
            tableId: table._id,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime
        });
        if (overlap) {
            return fail(409, "This table is already booked for the selected time");
        }

        const loyaltyPointsUsed = Number(req.body.loyaltyPoints || 0);
        if (!Number.isInteger(loyaltyPointsUsed) || loyaltyPointsUsed < 0) {
            return fail(400, "Loyalty points must be a whole number");
        }

        const maxPoints = maxRedeemablePoints(table.pricePerHour * schedule.duration);
        if (loyaltyPointsUsed > maxPoints) {
            return fail(400, `You can use up to ${maxPoints} points on this booking`);
        }

        if (loyaltyPointsUsed) {
            const description = `${table.name} on ${formatDay(schedule.date)}, ${formatClock(schedule.startTime)}`;
            if (!await redeemPoints({ user: req.user._id, points: loyaltyPointsUsed, description })) {
                return fail(400, "You do not have enough loyalty points");
            }
            redeemed = loyaltyPointsUsed;
        }

        const totalAmount = bookingTotal(table.pricePerHour, schedule.duration, loyaltyPointsUsed);
        let booking;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                booking = await Booking.create({
                    reference: createReference(schedule.dateKey),
                    branchId: table.branchId,
                    user: req.user._id,
                    table: table._id,
                    date: schedule.date,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    duration: schedule.duration,
                    hourlyRate: table.pricePerHour,
                    loyaltyPointsUsed,
                    totalAmount,
                    advanceAmount: getAdvanceAmount(totalAmount),
                    paymentAccount: snapshotPaymentAccount(payment.account),
                    transactionId: payment.transactionId,
                    paymentProof: req.file.filename,
                    paymentSubmittedAt: new Date(),
                    status: "pending"
                });
                break;
            } catch (error) {
                if (error.code !== 11000 || attempt === 4) throw error;
            }
        }

        await Waitlist.updateMany({
            user: req.user._id,
            table: table._id,
            date: schedule.date,
            status: { $in: ACTIVE_WAITLIST_STATUSES },
            startTime: { $lt: schedule.endTime },
            endTime: { $gt: schedule.startTime }
        }, { $set: { status: "booked" } });

        const created = await populateBooking(Booking.findById(booking._id));
        res.status(201).json({ booking: serializeBooking(created) });
    } catch (error) {
        discardUpload(req.file);
        await restorePoints({ user: req.user._id, points: redeemed, description: "Booking could not be saved" }).catch(() => {});
        console.error("Create client booking error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// streams the booking's payment proof image to its owner
export const getClientBookingProof = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            reference: String(req.params.reference || "").toUpperCase(),
            user: req.user._id
        }).select("paymentProof");

        if (!booking?.paymentProof) {
            return res.status(404).json({ message: "Payment proof not found" });
        }

        sendPaymentProof(res, booking.paymentProof);
    } catch (error) {
        console.error("Get booking proof error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const cancelClientBooking = async (req, res) => {
    try {
        const booking = await loadOwnedBooking(req.params.reference, req.user._id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (!["pending", "approved"].includes(booking.status)) {
            return res.status(400).json({ message: "Only pending or approved bookings can be cancelled" });
        }

        booking.status = "cancelled";
        booking.cancellationReason = String(req.body.reason || "").trim().slice(0, 300) || null;
        booking.cancelledAt = new Date();
        await booking.save();
        await restorePoints({ user: req.user._id, points: booking.loyaltyPointsUsed, description: `Cancelled booking ${booking.reference}` });

        res.status(200).json({ booking: serializeBooking(booking) });
        releaseSlot({ tableId: booking.table._id, date: booking.date, startTime: booking.startTime, endTime: booking.endTime });
    } catch (error) {
        console.error("Cancel client booking error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const rescheduleClientBooking = async (req, res) => {
    try {
        const booking = await loadOwnedBooking(req.params.reference, req.user._id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status !== "pending") {
            return res.status(400).json({ message: "Only pending bookings can be rescheduled" });
        }

        const schedule = parseSchedule(req.body, hoursFrom(booking.branchId));
        if (schedule.error) {
            return res.status(400).json({ message: schedule.error });
        }

        const overlap = await findOverlap({
            tableId: booking.table._id,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            excludeReference: booking.reference
        });
        if (overlap) {
            return res.status(409).json({ message: "This table is already booked for the selected time" });
        }

        const previousSlot = { tableId: booking.table._id, date: booking.date, startTime: booking.startTime, endTime: booking.endTime };
        booking.date = schedule.date;
        booking.startTime = schedule.startTime;
        booking.endTime = schedule.endTime;
        booking.duration = schedule.duration;
        booking.totalAmount = bookingTotal(booking.hourlyRate, schedule.duration, booking.loyaltyPointsUsed);
        await booking.save();

        res.status(200).json({ booking: serializeBooking(booking) });
        releaseSlot(previousSlot);
    } catch (error) {
        console.error("Reschedule client booking error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const changeClientBookingTable = async (req, res) => {
    try {
        const booking = await loadOwnedBooking(req.params.reference, req.user._id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status !== "pending") {
            return res.status(400).json({ message: "Only pending bookings can change table" });
        }

        const table = isObjectId(req.body.tableId) ? await Table.findById(req.body.tableId) : null;
        if (!table || String(table.branchId) !== String(booking.branchId._id || booking.branchId)) {
            return res.status(404).json({ message: "Table not found at this branch" });
        }

        if (table.status !== "available") {
            return res.status(400).json({ message: "This table is not available for booking" });
        }

        const overlap = await findOverlap({
            tableId: table._id,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            excludeReference: booking.reference
        });
        if (overlap) {
            return res.status(409).json({ message: "This table is already booked for the selected time" });
        }

        const previousSlot = { tableId: booking.table._id, date: booking.date, startTime: booking.startTime, endTime: booking.endTime };
        booking.table = table._id;
        booking.hourlyRate = table.pricePerHour;
        booking.totalAmount = bookingTotal(table.pricePerHour, booking.duration, booking.loyaltyPointsUsed);
        await booking.save();

        const updated = await populateBooking(Booking.findById(booking._id));
        res.status(200).json({ booking: serializeBooking(updated) });
        releaseSlot(previousSlot);
    } catch (error) {
        console.error("Change client booking table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listClientWaitlist = async (req, res) => {
    try {
        const entries = await populateWaitlist(Waitlist.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50));
        res.status(200).json({ waitlist: entries.map(serializeWaitlistEntry) });
    } catch (error) {
        console.error("List client waitlist error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// joins the waitlist for a slot that is currently booked: { tableId, date, startTime, duration }
export const joinWaitlist = async (req, res) => {
    try {
        const table = isObjectId(req.body.tableId) ? await Table.findById(req.body.tableId) : null;
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }

        if (table.status !== "available") {
            return res.status(400).json({ message: "This table is not available for booking" });
        }

        const schedule = parseSchedule(req.body, hoursFrom(await Branch.findById(table.branchId)));
        if (schedule.error) {
            return res.status(400).json({ message: schedule.error });
        }

        const slot = { tableId: table._id, date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime };
        const overlap = await findOverlap(slot);
        if (!overlap) {
            return res.status(409).json({ message: "This time is free. Book it now instead of joining the waitlist" });
        }

        if (String(overlap.user) === String(req.user._id)) {
            return res.status(409).json({ message: "You already have a booking at this time" });
        }

        const activeFilter = { user: req.user._id, status: { $in: ACTIVE_WAITLIST_STATUSES } };
        const duplicate = await Waitlist.findOne({
            ...activeFilter,
            table: table._id,
            date: schedule.date,
            startTime: { $lt: schedule.endTime },
            endTime: { $gt: schedule.startTime }
        });
        if (duplicate && waitlistStatus(duplicate) !== "expired") {
            return res.status(409).json({ message: "You are already on the waitlist for this time" });
        }

        const active = await Waitlist.find(activeFilter).select("date startTime status");
        if (active.filter((entry) => waitlistStatus(entry) !== "expired").length >= MAX_WAITLIST_ENTRIES) {
            return res.status(400).json({ message: `You can be on the waitlist for up to ${MAX_WAITLIST_ENTRIES} slots at a time` });
        }

        const entry = await Waitlist.create({
            branchId: table.branchId,
            user: req.user._id,
            table: table._id,
            date: schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            duration: schedule.duration
        });

        await notifyBranchAdmins({
            branchId: table.branchId,
            type: "waitlist",
            title: "New waitlist request",
            message: `${req.user.firstName} ${req.user.lastName} is waiting for ${table.name} on ${formatDay(schedule.date)} at ${formatClock(schedule.startTime)}.`,
            link: "/admin/dashboard"
        });

        const created = await populateWaitlist(Waitlist.findById(entry._id));
        res.status(201).json({ entry: serializeWaitlistEntry(created) });
    } catch (error) {
        console.error("Join waitlist error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const leaveWaitlist = async (req, res) => {
    try {
        const entry = isObjectId(req.params.id)
            ? await populateWaitlist(Waitlist.findOne({ _id: req.params.id, user: req.user._id }))
            : null;
        if (!entry) {
            return res.status(404).json({ message: "Waitlist entry not found" });
        }

        if (!ACTIVE_WAITLIST_STATUSES.includes(waitlistStatus(entry))) {
            return res.status(400).json({ message: "This waitlist entry is no longer active" });
        }

        entry.status = "cancelled";
        await entry.save();
        res.status(200).json({ entry: serializeWaitlistEntry(entry) });
    } catch (error) {
        console.error("Leave waitlist error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
