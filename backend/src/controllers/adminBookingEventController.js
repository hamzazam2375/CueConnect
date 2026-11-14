import crypto from "crypto";
import Booking from "../models/booking.js";
import Branch from "../models/branch.js";
import Event from "../models/event.js";
import Payment from "../models/payment.js";
import Income from "../models/income.js";
import TournamentReg from "../models/tournamentReg.js";
import Waitlist from "../models/waitlist.js";
import Table from "../models/table.js";
import User from "../models/user.js";
import { notifyUser } from "../services/notifications.js";
import { POINT_VALUE, restorePoints } from "../services/loyalty.js";
import { sendPaymentProof } from "../utils/payments.js";
import { recordReceivedIncome } from "../utils/recordIncome.js";

const BOOKING_STATUSES = ["pending", "approved", "completed", "rejected", "cancelled"];
const ACTIVE_BOOKING_STATUSES = ["pending", "approved"];
const EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];
const ALLOWED_DURATIONS = [1, 2, 3];
const DEFAULT_OPENING_TIME = 12 * 60;
const DEFAULT_CLOSING_TIME = 26 * 60;

// which status an admin may move a booking or registration to from its current one
const BOOKING_TRANSITIONS = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["completed", "cancelled"]
};
const REGISTRATION_TRANSITIONS = {
    registered: ["confirmed", "rejected"],
    confirmed: ["rejected"],
    rejected: ["confirmed"]
};

const BOOKING_NOTICES = {
    approved: { title: "Booking approved", text: "is confirmed. See you at the club!" },
    rejected: { title: "Booking rejected", text: "was rejected by the club." },
    cancelled: { title: "Booking cancelled", text: "was cancelled by the club." },
    completed: { title: "Booking completed", text: "is marked as completed. Thanks for playing!" }
};

// ── date and time helpers (bookings store their day as midnight UTC plus minutes after midnight) ──

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDate = (dateKey) => {
    if (!DATE_KEY.test(dateKey)) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey ? null : date;
};

const slotHasStarted = (date, startTime) => new Date(date.getTime() + startTime * 60 * 1000) <= new Date();

const formatClock = (minutes) => {
    const hour = Math.floor((minutes % 1440) / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const formatDay = (date) => date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

const branchHours = async (branchId) => {
    const branch = await Branch.findById(branchId).select("openingTime closingTime");
    const openingTime = Number(branch?.openingTime);
    const closingTime = Number(branch?.closingTime);
    return {
        openingTime: Number.isFinite(openingTime) ? openingTime : DEFAULT_OPENING_TIME,
        closingTime: Number.isFinite(closingTime) ? closingTime : DEFAULT_CLOSING_TIME
    };
};

const createBookingReference = (date) => `CC-${date.toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

// notifications are a courtesy; a failure must never undo the admin's action
const notifySafely = async (payload) => {
    try {
        await notifyUser(payload);
    } catch (error) {
        console.error("Admin notification error:", error.message);
    }
};

// ── serializers ──

const customerOf = (user) => user ? {
    id: String(user._id),
    name: `${user.firstName} ${user.lastName}`.trim(),
    customerId: user.customerCode || null,
    email: user.email,
    phone: user.phone || ""
} : null;

const populateBooking = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("table", "name tableType pricePerHour")
    .populate("branchId", "branchName branchCode");

const serializeBooking = (booking) => ({
    id: String(booking._id),
    reference: booking.reference,
    customer: customerOf(booking.user),
    table: booking.table ? { id: String(booking.table._id), name: booking.table.name, type: booking.table.tableType } : null,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    duration: booking.duration,
    hourlyRate: booking.hourlyRate,
    loyaltyPointsUsed: booking.loyaltyPointsUsed || 0,
    total: booking.totalAmount,
    advanceAmount: booking.advanceAmount,
    remainingAmount: Math.max(booking.totalAmount - booking.advanceAmount, 0),
    transactionId: booking.transactionId,
    hasPaymentProof: Boolean(booking.paymentProof),
    paymentSubmittedAt: booking.paymentSubmittedAt,
    status: booking.status,
    rejectionReason: booking.rejectionReason,
    cancellationReason: booking.cancellationReason,
    createdAt: booking.createdAt
});

const populateRegistration = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("event", "title date type registrationFee")
    .populate("branchId", "branchName branchCode");

const serializeRegistration = (registration) => ({
    id: String(registration._id),
    reference: registration.reference,
    customer: customerOf(registration.user),
    event: registration.event ? {
        id: String(registration.event._id),
        title: registration.event.title,
        date: registration.event.date,
        type: registration.event.type
    } : null,
    feePaid: registration.feePaid,
    transactionId: registration.transactionId,
    hasPaymentProof: Boolean(registration.paymentProof),
    paymentSubmittedAt: registration.paymentSubmittedAt,
    status: registration.status,
    rejectionReason: registration.rejectionReason,
    createdAt: registration.createdAt
});

const serializeEvent = (event) => ({
    id: String(event._id),
    title: event.title,
    description: event.description || "",
    date: event.date,
    type: event.type,
    registrationFee: event.registrationFee,
    prize: event.prize || "",
    maxParticipants: event.maxParticipants,
    participantCount: event.participantCount || 0,
    status: event.status,
    archived: event.archived === true
});

const populateWaitlist = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("table", "name tableType")
    .populate("branchId", "branchName");

const serializeWaitlist = (entry) => ({
    id: String(entry._id),
    customer: customerOf(entry.user),
    table: entry.table ? { id: String(entry.table._id), name: entry.table.name, type: entry.table.tableType } : null,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
    status: entry.status,
    notifiedAt: entry.notifiedAt,
    createdAt: entry.createdAt
});

const loadBranchEvent = (id, branchId) => Event.findOne({ _id: id, branchId });

// ── bookings ──

export const listAdminBookings = async (req, res) => {
    try {
        const { status, from, to } = req.query;
        const filter = { branchId: req.user.branchId };
        if (status && BOOKING_STATUSES.includes(status)) filter.status = status;
        const fromDate = from ? toUtcDate(String(from)) : null;
        const toDate = to ? toUtcDate(String(to)) : null;
        if (fromDate || toDate) {
            filter.date = {};
            if (fromDate) filter.date.$gte = fromDate;
            if (toDate) filter.date.$lte = toDate;
        }
        const bookings = await populateBooking(Booking.find(filter).sort({ date: 1, startTime: 1 }));
        res.json({ bookings: bookings.map(serializeBooking) });
    } catch (error) {
        console.error("List admin bookings error:", error.message);
        res.status(500).json({ message: "Bookings could not be loaded" });
    }
};

// validates an admin-made booking against the branch's tables, customers, hours, and other bookings
const parseAdminBooking = async (body, branchId, existing = null) => {
    const table = await Table.findOne({ _id: String(body.tableId || ""), branchId }).catch(() => null);
    if (!table) return { error: "Table not found" };
    if (table.status === "maintenance") return { error: "This table is under maintenance" };

    const user = await User.findOne({ _id: String(body.userId || ""), role: "client", isActive: { $ne: false } }).catch(() => null);
    if (!user) return { error: "A valid active customer is required" };

    const date = toUtcDate(String(body.date || "").trim());
    const startTime = Number(body.startTime);
    const duration = Number(body.duration);
    if (!date || !ALLOWED_DURATIONS.includes(duration) || !Number.isInteger(startTime) || startTime % 60 !== 0) {
        return { error: "Choose a date, an on-the-hour start time, and a 1–3 hour duration" };
    }

    const hours = await branchHours(branchId);
    const endTime = startTime + duration * 60;
    if (startTime < hours.openingTime || endTime > hours.closingTime) {
        return { error: `Bookings must fall within club hours (${formatClock(hours.openingTime)} – ${formatClock(hours.closingTime)})` };
    }

    const scheduleChanged = !existing
        || existing.date.getTime() !== date.getTime()
        || existing.startTime !== startTime
        || existing.endTime !== endTime;
    if (scheduleChanged && slotHasStarted(date, startTime)) {
        return { error: "This time slot has already started" };
    }

    const overlap = await Booking.exists({
        ...(existing ? { _id: { $ne: existing._id } } : {}),
        table: table._id,
        date,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
    });
    if (overlap) return { error: "This table is already booked for the selected time", status: 409 };

    // keep any loyalty discount the client already spent on this booking
    const pointsUsed = existing?.loyaltyPointsUsed || 0;
    return {
        table,
        user,
        date,
        startTime,
        endTime,
        duration,
        totalAmount: Math.max(table.pricePerHour * duration - pointsUsed * POINT_VALUE, 0)
    };
};

export const createAdminBooking = async (req, res) => {
    try {
        const parsed = await parseAdminBooking(req.body, req.user.branchId);
        if (parsed.error) return res.status(parsed.status || 400).json({ message: parsed.error });

        const booking = await Booking.create({
            reference: createBookingReference(parsed.date),
            branchId: req.user.branchId,
            user: parsed.user._id,
            table: parsed.table._id,
            date: parsed.date,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            duration: parsed.duration,
            hourlyRate: parsed.table.pricePerHour,
            totalAmount: parsed.totalAmount,
            advanceAmount: 0,
            status: "approved"
        });

        await notifySafely({
            user: parsed.user._id,
            branchId: req.user.branchId,
            type: "booking",
            title: "Table booked for you",
            message: `The club booked ${parsed.table.name} for you on ${formatDay(parsed.date)}, ${formatClock(parsed.startTime)} – ${formatClock(parsed.endTime)}.`,
            link: "/client/bookings"
        });

        const created = await populateBooking(Booking.findById(booking._id));
        res.status(201).json({ booking: serializeBooking(created) });
    } catch (error) {
        console.error("Create admin booking error:", error.message);
        res.status(500).json({ message: "Booking could not be created" });
    }
};

export const editAdminBooking = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, branchId: req.user.branchId });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
            return res.status(400).json({ message: "Only pending or approved bookings can be edited" });
        }

        const parsed = await parseAdminBooking(req.body, req.user.branchId, booking);
        if (parsed.error) return res.status(parsed.status || 400).json({ message: parsed.error });

        booking.set({
            user: parsed.user._id,
            table: parsed.table._id,
            date: parsed.date,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            duration: parsed.duration,
            hourlyRate: parsed.table.pricePerHour,
            totalAmount: parsed.totalAmount
        });
        await booking.save();

        const updated = await populateBooking(Booking.findById(booking._id));
        res.json({ booking: serializeBooking(updated) });
    } catch (error) {
        console.error("Edit admin booking error:", error.message);
        res.status(500).json({ message: "Booking could not be edited" });
    }
};

export const updateAdminBooking = async (req, res) => {
    try {
        const booking = await populateBooking(Booking.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const { status } = req.body;
        if (!BOOKING_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid booking status" });
        }
        if (!(BOOKING_TRANSITIONS[booking.status] || []).includes(status)) {
            return res.status(400).json({ message: `A ${booking.status} booking cannot be marked ${status}` });
        }
        if (status === "approved") {
            const conflict = await Booking.exists({
                _id: { $ne: booking._id },
                table: booking.table?._id,
                date: booking.date,
                status: "approved",
                startTime: { $lt: booking.endTime },
                endTime: { $gt: booking.startTime }
            });
            if (conflict) return res.status(409).json({ message: "This booking conflicts with another approved booking" });
        }

        const reason = String(req.body.reason ?? req.body.rejectionReason ?? "").trim().slice(0, 300) || null;
        booking.status = status;
        if (status === "rejected") booking.rejectionReason = reason;
        if (status === "cancelled") {
            booking.cancellationReason = reason || "Cancelled by the club";
            booking.cancelledAt = new Date();
        }
        await booking.save();

        if (["rejected", "cancelled"].includes(status) && booking.loyaltyPointsUsed > 0) {
            await restorePoints({
                user: booking.user?._id,
                points: booking.loyaltyPointsUsed,
                description: `Booking ${booking.reference} was ${status} by the club`
            });
        }

        const notice = BOOKING_NOTICES[status];
        if (notice && booking.user) {
            const when = `${booking.table?.name || "Your table"} on ${formatDay(booking.date)}, ${formatClock(booking.startTime)}`;
            await notifySafely({
                user: booking.user._id,
                branchId: req.user.branchId,
                type: "booking",
                title: notice.title,
                message: `Your booking ${booking.reference} (${when}) ${notice.text}${reason && status !== "completed" ? ` Reason: ${reason}` : ""}`,
                link: "/client/bookings"
            });
        }

        res.json({ booking: serializeBooking(booking) });
    } catch (error) {
        console.error("Update admin booking error:", error.message);
        res.status(500).json({ message: "Booking could not be updated" });
    }
};

export const getAdminBookingProof = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, branchId: req.user.branchId }).select("paymentProof");
        if (!booking?.paymentProof) return res.status(404).json({ message: "Payment proof not found" });
        sendPaymentProof(res, booking.paymentProof);
    } catch (error) {
        console.error("Get admin booking proof error:", error.message);
        res.status(500).json({ message: "Payment proof could not be loaded" });
    }
};

// ── waitlist ──

export const listAdminWaitlist = async (req, res) => {
    try {
        const entries = await populateWaitlist(Waitlist.find({
            branchId: req.user.branchId,
            status: { $in: ["waiting", "notified"] }
        }).sort({ date: 1, startTime: 1, createdAt: 1 }));
        // entries whose slot has already started have expired
        const current = entries.filter((entry) => !slotHasStarted(entry.date, entry.startTime));
        res.json({ waitlist: current.map(serializeWaitlist) });
    } catch (error) {
        console.error("List admin waitlist error:", error.message);
        res.status(500).json({ message: "Waitlist could not be loaded" });
    }
};

export const notifyWaitlistCustomer = async (req, res) => {
    try {
        const entry = await populateWaitlist(Waitlist.findOne({
            _id: req.params.id,
            branchId: req.user.branchId,
            status: "waiting"
        }));
        if (!entry || !entry.table || !entry.user) return res.status(404).json({ message: "Active waitlist entry not found" });
        if (slotHasStarted(entry.date, entry.startTime)) {
            return res.status(400).json({ message: "This waitlisted slot has already started" });
        }

        const conflict = await Booking.exists({
            table: entry.table._id,
            date: entry.date,
            status: { $in: ACTIVE_BOOKING_STATUSES },
            startTime: { $lt: entry.endTime },
            endTime: { $gt: entry.startTime }
        });
        if (conflict) return res.status(409).json({ message: "This slot is still booked, so the customer cannot be offered it yet" });

        entry.status = "notified";
        entry.notifiedAt = new Date();
        await entry.save();
        await notifySafely({
            user: entry.user._id,
            branchId: req.user.branchId,
            type: "waitlist",
            title: "Your waitlisted table is free",
            message: `${entry.table.name} is free on ${formatDay(entry.date)}, ${formatClock(entry.startTime)} – ${formatClock(entry.endTime)}. Book it before someone else does.`,
            link: "/client/bookings?tab=waitlist"
        });

        res.json({ waitlist: serializeWaitlist(entry) });
    } catch (error) {
        console.error("Notify waitlist customer error:", error.message);
        res.status(500).json({ message: "Waitlist customer could not be notified" });
    }
};

// ── events ──

export const listAdminEvents = async (req, res) => {
    try {
        const filter = { branchId: req.user.branchId, archived: req.query.archived === "true" ? true : { $ne: true } };
        if (req.query.status && EVENT_STATUSES.includes(req.query.status)) filter.status = req.query.status;
        const events = await Event.find(filter).sort({ date: 1 });
        res.json({ events: events.map(serializeEvent) });
    } catch (error) {
        console.error("List admin events error:", error.message);
        res.status(500).json({ message: "Events could not be loaded" });
    }
};

const validateEvent = (body) => {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const type = body.type;
    const date = new Date(body.date);
    const registrationFee = body.registrationFee === "" || body.registrationFee == null ? 0 : Number(body.registrationFee);
    const maxParticipants = body.maxParticipants === "" || body.maxParticipants == null ? null : Number(body.maxParticipants);
    if (!title || !["tournament", "event"].includes(type) || !body.date || Number.isNaN(date.getTime())) {
        return { error: "Title, type, and date are required" };
    }
    if (title.length > 120) return { error: "Title must be 120 characters or fewer" };
    if (!Number.isFinite(registrationFee) || registrationFee < 0 || (maxParticipants !== null && (!Number.isInteger(maxParticipants) || maxParticipants < 1))) {
        return { error: "Enter a valid fee and participant limit" };
    }
    return { value: { title, description, type, date, registrationFee, maxParticipants, prize: String(body.prize || "").trim() || null } };
};

export const createAdminEvent = async (req, res) => {
    try {
        const parsed = validateEvent(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        if (parsed.value.date <= new Date()) return res.status(400).json({ message: "New events must be scheduled in the future" });
        const event = await Event.create({ ...parsed.value, branchId: req.user.branchId });
        res.status(201).json({ event: serializeEvent(event) });
    } catch (error) {
        console.error("Create admin event error:", error.message);
        res.status(500).json({ message: "Event could not be created" });
    }
};

export const updateAdminEvent = async (req, res) => {
    try {
        const event = await loadBranchEvent(req.params.id, req.user.branchId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        const parsed = validateEvent(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        if (parsed.value.maxParticipants !== null && parsed.value.maxParticipants < event.participantCount) {
            return res.status(400).json({ message: "Participant limit cannot be below current registrations" });
        }
        if (parsed.value.registrationFee !== event.registrationFee && await TournamentReg.exists({ event: event._id })) {
            return res.status(400).json({ message: "The fee cannot change once customers have registered" });
        }
        event.set(parsed.value);
        await event.save();
        res.json({ event: serializeEvent(event) });
    } catch (error) {
        console.error("Update admin event error:", error.message);
        res.status(500).json({ message: "Event could not be updated" });
    }
};

export const updateAdminEventStatus = async (req, res) => {
    try {
        const event = await loadBranchEvent(req.params.id, req.user.branchId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        const { status } = req.body;
        if (!EVENT_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid event status" });
        if (status === event.status) return res.json({ event: serializeEvent(event) });

        event.status = status;
        await event.save();

        // let everyone holding a spot know the event is off
        if (status === "cancelled") {
            const registrations = await TournamentReg.find({ event: event._id, status: { $in: ["registered", "confirmed"] } }).select("user");
            await Promise.all(registrations.map((registration) => notifySafely({
                user: registration.user,
                branchId: req.user.branchId,
                type: "event",
                title: "Event cancelled",
                message: `${event.title} has been cancelled by the club. Please contact the club about any fee you paid.`,
                link: "/client/events"
            })));
        }

        res.json({ event: serializeEvent(event) });
    } catch (error) {
        console.error("Update admin event status error:", error.message);
        res.status(500).json({ message: "Event status could not be updated" });
    }
};

// archives an event (hidden from clients and the main list) or restores it with { archived: false }
export const archiveAdminEvent = async (req, res) => {
    try {
        const event = await loadBranchEvent(req.params.id, req.user.branchId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        event.archived = req.body?.archived !== false;
        await event.save();
        res.json({ event: serializeEvent(event) });
    } catch (error) {
        console.error("Archive admin event error:", error.message);
        res.status(500).json({ message: "Event could not be archived" });
    }
};

export const deleteAdminEvent = async (req, res) => {
    try {
        const event = await loadBranchEvent(req.params.id, req.user.branchId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (await TournamentReg.exists({ event: event._id })) {
            return res.status(400).json({ message: "Events with registrations cannot be deleted; archive them instead" });
        }
        await event.deleteOne();
        res.json({ message: "Event deleted" });
    } catch (error) {
        console.error("Delete admin event error:", error.message);
        res.status(500).json({ message: "Event could not be deleted" });
    }
};

// ── event registrations ──

export const listAdminEventRegistrations = async (req, res) => {
    try {
        const event = await loadBranchEvent(req.params.id, req.user.branchId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        const registrations = await populateRegistration(TournamentReg.find({ event: event._id }).sort({ createdAt: -1 }));
        res.json({ registrations: registrations.map(serializeRegistration) });
    } catch (error) {
        console.error("List admin event registrations error:", error.message);
        res.status(500).json({ message: "Registrations could not be loaded" });
    }
};

// a confirmed paid registration is money the club received, so it shows up in Finance as tournament income
const recordRegistrationIncome = async (registration, branchId) => {
    if (!(registration.feePaid > 0)) return;
    let payment = await Payment.findOne({ type: "event", referenceId: registration._id });
    if (!payment) {
        payment = await Payment.create({
            branchId,
            user: registration.user?._id || null,
            type: "event",
            referenceId: registration._id,
            amount: registration.feePaid,
            method: "online",
            status: "completed",
            paymentProof: registration.paymentProof || null
        });
    } else if (payment.status !== "completed") {
        payment.status = "completed";
        await payment.save();
    }

    const income = await Income.findOne({ paymentId: payment._id });
    if (income) {
        if (income.status !== "completed") {
            income.status = "completed";
            await income.save();
        }
        return;
    }
    await recordReceivedIncome({
        branchId,
        paymentId: payment._id,
        amount: registration.feePaid,
        method: "online",
        sourceType: "tournament",
        description: `Entry fee · ${registration.event?.title || "Event"} (${registration.reference})`,
        source: `${registration.reference} · online`
    });
};

const reverseRegistrationIncome = async (registration) => {
    const payment = await Payment.findOne({ type: "event", referenceId: registration._id, status: "completed" });
    if (!payment) return;
    payment.status = "refunded";
    await payment.save();
    await Income.updateOne({ paymentId: payment._id }, { $set: { status: "refunded" } });
};

export const updateAdminEventRegistration = async (req, res) => {
    try {
        const registration = await populateRegistration(TournamentReg.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!registration) return res.status(404).json({ message: "Registration not found" });

        const { status } = req.body;
        if (!["confirmed", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid registration status" });
        if (!(REGISTRATION_TRANSITIONS[registration.status] || []).includes(status)) {
            return res.status(400).json({ message: `A ${registration.status} registration cannot be marked ${status}` });
        }

        const eventId = registration.event?._id;
        // a rejected registration gave its spot back, so confirming it again needs a free spot
        if (registration.status === "rejected" && status === "confirmed") {
            const event = await Event.findOne({ _id: eventId });
            const seat = await Event.updateOne(
                {
                    _id: eventId,
                    ...(event?.maxParticipants ? { participantCount: { $lt: event.maxParticipants } } : {})
                },
                { $inc: { participantCount: 1 } }
            );
            if (seat.modifiedCount !== 1) return res.status(409).json({ message: "This event is already full" });
        }

        const wasHoldingSpot = ["registered", "confirmed"].includes(registration.status);
        registration.status = status;
        registration.rejectionReason = status === "rejected"
            ? String(req.body.reason ?? req.body.rejectionReason ?? "").trim().slice(0, 300) || null
            : null;
        await registration.save();

        if (status === "rejected") {
            if (wasHoldingSpot) {
                await Event.updateOne({ _id: eventId, participantCount: { $gt: 0 } }, { $inc: { participantCount: -1 } });
            }
            await reverseRegistrationIncome(registration);
        } else {
            await recordRegistrationIncome(registration, req.user.branchId);
        }

        if (registration.user) {
            await notifySafely({
                user: registration.user._id,
                branchId: req.user.branchId,
                type: "event",
                title: status === "confirmed" ? "Registration confirmed" : "Registration rejected",
                message: status === "confirmed"
                    ? `Your spot in ${registration.event?.title || "the event"} is confirmed (${registration.reference}).`
                    : `Your registration for ${registration.event?.title || "the event"} was rejected.${registration.rejectionReason ? ` Reason: ${registration.rejectionReason}` : ""}`,
                link: "/client/events"
            });
        }

        res.json({ registration: serializeRegistration(registration) });
    } catch (error) {
        console.error("Update admin event registration error:", error.message);
        res.status(500).json({ message: "Registration could not be updated" });
    }
};

export const getAdminEventRegistrationProof = async (req, res) => {
    try {
        const registration = await TournamentReg.findOne({ _id: req.params.id, branchId: req.user.branchId }).select("paymentProof");
        if (!registration?.paymentProof) return res.status(404).json({ message: "Payment proof not found" });
        sendPaymentProof(res, registration.paymentProof);
    } catch (error) {
        console.error("Get admin event registration proof error:", error.message);
        res.status(500).json({ message: "Payment proof could not be loaded" });
    }
};
