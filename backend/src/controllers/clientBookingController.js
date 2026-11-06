import crypto from "crypto";
import path from "path";
import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Table from "../models/table.js";
import Booking from "../models/booking.js";
import { PAYMENT_PROOF_DIR, discardUpload } from "../middleware/upload.js";

export const MAX_BOOKING_DAYS = 30;
const ALLOWED_DURATIONS = [1, 2, 3];
const BUSY_STATUSES = ["pending", "approved"];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TRANSACTION_ID = /^[A-Za-z0-9-]{4,40}$/;

// share of the booking total paid upfront with the payment proof
const ADVANCE_RATE = 0.5;
const getAdvanceAmount = (total) => Math.ceil(total * ADVANCE_RATE);

// club hours are not stored on Branch yet; keep in sync with the booking UI
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

const formatBranchName = (branch) => {
    const name = branch.branchName || "";
    return name.toUpperCase().startsWith("GOODSHOT") ? name.toUpperCase() : `GOODSHOT ${name}`.trim();
};

const serializePaymentAccount = (account) => ({
    id: String(account._id),
    method: account.method,
    provider: account.provider,
    accountTitle: account.accountTitle,
    accountNumber: account.accountNumber
});

const serializeBranch = (branch, tables = []) => ({
    id: String(branch._id),
    name: formatBranchName(branch),
    code: branch.branchCode,
    paymentAccounts: (branch.paymentAccounts || []).map(serializePaymentAccount),
    openingTime: DEFAULT_OPENING_TIME,
    closingTime: DEFAULT_CLOSING_TIME,
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

const serializeBooking = (booking) => {
    const table = booking.table;
    const branch = booking.branchId;

    return {
        reference: booking.reference,
        branchId: String(branch._id || branch),
        branchName: branch.branchName ? formatBranchName(branch) : "",
        tableId: String(table._id || table),
        tableName: table.name,
        tableType: table.tableType,
        date: toDateKey(booking.date),
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
        hourlyRate: booking.hourlyRate,
        total: booking.totalAmount,
        advanceAmount: booking.advanceAmount,
        remainingAmount: Math.max(booking.totalAmount - booking.advanceAmount, 0),
        paymentAccount: booking.paymentAccount?.method ? {
            method: booking.paymentAccount.method,
            provider: booking.paymentAccount.provider,
            accountTitle: booking.paymentAccount.accountTitle,
            accountNumber: booking.paymentAccount.accountNumber
        } : null,
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
    .populate("branchId", "branchName branchCode");

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

// multipart request: booking fields plus `paymentAccountId`, `transactionId`, and the `paymentProof` image
export const createClientBooking = async (req, res) => {
    const fail = (status, message) => {
        discardUpload(req.file);
        return res.status(status).json({ message });
    };

    try {
        const table = isObjectId(req.body.tableId) ? await Table.findById(req.body.tableId) : null;
        if (!table) {
            return fail(404, "Table not found");
        }

        if (table.status !== "available") {
            return fail(400, "This table is not available for booking");
        }

        const schedule = parseSchedule(req.body);
        if (schedule.error) {
            return fail(400, schedule.error);
        }

        const branch = await Branch.findById(table.branchId);
        const account = branch?.paymentAccounts.id(isObjectId(req.body.paymentAccountId) ? req.body.paymentAccountId : null);
        if (!account) {
            return fail(400, "Select one of the club's payment accounts");
        }

        const transactionId = String(req.body.transactionId || "").trim().toUpperCase();
        if (!TRANSACTION_ID.test(transactionId)) {
            return fail(400, "Enter the transaction ID from your payment receipt");
        }

        if (!req.file) {
            return fail(400, "Upload a screenshot of your payment as proof");
        }

        if (await Booking.exists({ transactionId, "paymentAccount.method": account.method })) {
            return fail(409, "This transaction ID has already been used for another booking");
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

        const totalAmount = table.pricePerHour * schedule.duration;
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
                    totalAmount,
                    advanceAmount: getAdvanceAmount(totalAmount),
                    paymentAccount: {
                        method: account.method,
                        provider: account.provider,
                        accountTitle: account.accountTitle,
                        accountNumber: account.accountNumber
                    },
                    transactionId,
                    paymentProof: req.file.filename,
                    paymentSubmittedAt: new Date(),
                    status: "pending"
                });
                break;
            } catch (error) {
                if (error.code !== 11000 || attempt === 4) throw error;
            }
        }

        const created = await populateBooking(Booking.findById(booking._id));
        res.status(201).json({ booking: serializeBooking(created) });
    } catch (error) {
        discardUpload(req.file);
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

        res.sendFile(path.basename(booking.paymentProof), { root: PAYMENT_PROOF_DIR }, (error) => {
            if (error && !res.headersSent) res.status(404).json({ message: "Payment proof not found" });
        });
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

        res.status(200).json({ booking: serializeBooking(booking) });
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

        const schedule = parseSchedule(req.body);
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

        booking.date = schedule.date;
        booking.startTime = schedule.startTime;
        booking.endTime = schedule.endTime;
        booking.duration = schedule.duration;
        booking.totalAmount = booking.hourlyRate * schedule.duration;
        await booking.save();

        res.status(200).json({ booking: serializeBooking(booking) });
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

        booking.table = table._id;
        booking.hourlyRate = table.pricePerHour;
        booking.totalAmount = table.pricePerHour * booking.duration;
        await booking.save();

        const updated = await populateBooking(Booking.findById(booking._id));
        res.status(200).json({ booking: serializeBooking(updated) });
    } catch (error) {
        console.error("Change client booking table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
