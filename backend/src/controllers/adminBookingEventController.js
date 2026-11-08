import mongoose from "mongoose";
import Booking from "../models/booking.js";
import Event from "../models/event.js";
import TournamentReg from "../models/tournamentReg.js";
import Waitlist from "../models/waitlist.js";
import { sendPaymentProof } from "../utils/payments.js";
import { releaseSlot } from "./clientBookingController.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const bookingStatuses = ["pending", "approved", "completed", "rejected", "cancelled"];
const eventStatuses = ["upcoming", "ongoing", "completed", "cancelled"];

const populateBooking = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("table", "name tableType pricePerHour")
    .populate("branchId", "branchName branchCode");

const serializeBooking = (booking) => ({
    id: String(booking._id),
    reference: booking.reference,
    customer: booking.user ? {
        id: String(booking.user._id),
        name: `${booking.user.firstName} ${booking.user.lastName}`.trim(),
        customerId: booking.user.customerCode || null,
        email: booking.user.email,
        phone: booking.user.phone || ""
    } : null,
    table: booking.table ? { name: booking.table.name, type: booking.table.tableType } : null,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    duration: booking.duration,
    total: booking.totalAmount,
    advanceAmount: booking.advanceAmount,
    remainingAmount: Math.max(booking.totalAmount - booking.advanceAmount, 0),
    transactionId: booking.transactionId,
    hasPaymentProof: Boolean(booking.paymentProof),
    paymentSubmittedAt: booking.paymentSubmittedAt,
    status: booking.status,
    rejectionReason: booking.rejectionReason,
    createdAt: booking.createdAt
});

const populateRegistration = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("event", "title date type registrationFee")
    .populate("branchId", "branchName branchCode");

const serializeRegistration = (registration) => ({
    id: String(registration._id),
    reference: registration.reference,
    customer: registration.user ? {
        id: String(registration.user._id),
        name: `${registration.user.firstName} ${registration.user.lastName}`.trim(),
        customerId: registration.user.customerCode || null,
        email: registration.user.email,
        phone: registration.user.phone || ""
    } : null,
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

const serializeEvent = (event, registrations = 0) => ({
    id: String(event._id),
    title: event.title,
    description: event.description || "",
    date: event.date,
    type: event.type,
    registrationFee: event.registrationFee,
    prize: event.prize || "",
    maxParticipants: event.maxParticipants,
    participantCount: registrations || event.participantCount || 0,
    status: event.status
});

const loadBranchEvent = (id, branchId) => isObjectId(id)
    ? Event.findOne({ _id: id, branchId })
    : null;

export const listAdminBookings = async (req, res) => {
    try {
        const { status, from, to } = req.query;
        const filter = { branchId: req.user.branchId };
        if (status && bookingStatuses.includes(status)) filter.status = status;
        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(`${from}T00:00:00.000Z`);
            if (to) filter.date.$lte = new Date(`${to}T23:59:59.999Z`);
        }
        const bookings = await populateBooking(Booking.find(filter).sort({ date: 1, startTime: 1 }));
        res.json({ bookings: bookings.map(serializeBooking) });
    } catch (error) {
        console.error("List admin bookings error:", error.message);
        res.status(500).json({ message: "Bookings could not be loaded" });
    }
};

export const updateAdminBooking = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, branchId: req.user.branchId });
        if (!booking) return res.status(404).json({ message: "Booking not found" });
        const { status, rejectionReason } = req.body;
        if (!["approved", "rejected", "cancelled"].includes(status)) {
            return res.status(400).json({ message: "Invalid booking status" });
        }
        if (status === "approved") {
            const conflict = await Booking.exists({
                _id: { $ne: booking._id },
                table: booking.table,
                date: booking.date,
                status: { $in: ["pending", "approved"] },
                startTime: { $lt: booking.endTime },
                endTime: { $gt: booking.startTime }
            });
            if (conflict) return res.status(409).json({ message: "This booking conflicts with another booking" });
        }
        const wasHoldingSlot = ["pending", "approved"].includes(booking.status);
        booking.status = status;
        booking.rejectionReason = status === "rejected" ? String(rejectionReason || "").trim() : null;
        await booking.save();
        if (wasHoldingSlot && ["rejected", "cancelled"].includes(status)) {
            await releaseSlot({ tableId: booking.table, date: booking.date, startTime: booking.startTime, endTime: booking.endTime });
        }
        const updated = await populateBooking(Booking.findById(booking._id));
        res.json({ booking: serializeBooking(updated) });
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

const populateWaitlist = (query) => query
    .populate("user", "firstName lastName email phone customerCode")
    .populate("table", "name tableType")
    .populate("branchId", "branchName");

const serializeWaitlist = (entry) => ({
    id: String(entry._id),
    customer: entry.user ? {
        name: `${entry.user.firstName} ${entry.user.lastName}`.trim(),
        customerId: entry.user.customerCode || null,
        email: entry.user.email,
        phone: entry.user.phone || ""
    } : null,
    table: entry.table ? { name: entry.table.name, type: entry.table.tableType } : null,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    duration: entry.duration,
    status: entry.status,
    createdAt: entry.createdAt
});

export const listAdminWaitlist = async (req, res) => {
    try {
        const entries = await populateWaitlist(Waitlist.find({
            branchId: req.user.branchId,
            status: { $in: ["waiting", "notified"] }
        }).sort({ createdAt: 1 }));
        res.json({ waitlist: entries.map(serializeWaitlist) });
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
        if (!entry) return res.status(404).json({ message: "Active waitlist entry not found" });

        await releaseSlot({
            tableId: entry.table._id,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime
        });
        const updated = await populateWaitlist(Waitlist.findById(entry._id));
        if (updated?.status !== "notified") return res.status(409).json({ message: "This slot is not currently free" });
        res.json({ waitlist: serializeWaitlist(updated) });
    } catch (error) {
        console.error("Notify waitlist customer error:", error.message);
        res.status(500).json({ message: "Waitlist customer could not be notified" });
    }
};


export const listAdminEvents = async (req, res) => {
    try {
        const filter = { branchId: req.user.branchId };
        if (req.query.status && eventStatuses.includes(req.query.status)) filter.status = req.query.status;
        const events = await Event.find(filter).sort({ date: 1 });
        res.json({ events: events.map((event) => serializeEvent(event)) });
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
    const registrationFee = Number(body.registrationFee || 0);
    const maxParticipants = body.maxParticipants === "" || body.maxParticipants == null ? null : Number(body.maxParticipants);
    if (!title || !["tournament", "event"].includes(type) || Number.isNaN(date.getTime())) return { error: "Title, type, and date are required" };
    if (!Number.isFinite(registrationFee) || registrationFee < 0 || (maxParticipants !== null && (!Number.isInteger(maxParticipants) || maxParticipants < 1))) {
        return { error: "Enter valid fee and participant limit values" };
    }
    return { value: { title, description, type, date, registrationFee, maxParticipants, prize: String(body.prize || "").trim() || null } };
};

export const createAdminEvent = async (req, res) => {
    try {
        const parsed = validateEvent(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
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
        if (!eventStatuses.includes(req.body.status)) return res.status(400).json({ message: "Invalid event status" });
        event.status = req.body.status;
        await event.save();
        res.json({ event: serializeEvent(event) });
    } catch (error) {
        console.error("Update admin event status error:", error.message);
        res.status(500).json({ message: "Event status could not be updated" });
    }
};

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

export const updateAdminEventRegistration = async (req, res) => {
    try {
        const registration = await populateRegistration(TournamentReg.findOne({ _id: req.params.id, branchId: req.user.branchId }));
        if (!registration) return res.status(404).json({ message: "Registration not found" });
        if (!["confirmed", "rejected"].includes(req.body.status)) return res.status(400).json({ message: "Invalid registration status" });
        const wasHoldingSpot = ["registered", "confirmed"].includes(registration.status);
        registration.status = req.body.status;
        registration.rejectionReason = req.body.status === "rejected" ? String(req.body.rejectionReason || "").trim() : null;
        await registration.save();
        if (wasHoldingSpot && req.body.status === "rejected") {
            await Event.updateOne({ _id: registration.event._id, participantCount: { $gt: 0 } }, { $inc: { participantCount: -1 } });
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
