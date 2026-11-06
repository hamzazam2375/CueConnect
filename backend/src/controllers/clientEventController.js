import crypto from "crypto";
import path from "path";
import mongoose from "mongoose";
import Branch from "../models/branch.js";
import Event from "../models/event.js";
import Membership from "../models/membership.js";
import TournamentReg from "../models/tournamentReg.js";
import { discardUpload, PAYMENT_PROOF_DIR } from "../middleware/upload.js";
import { parsePayment, sendPaymentProof, serializePaymentAccount, serializePaymentSnapshot, snapshotPaymentAccount } from "../utils/payments.js";

// registrations that hold a spot in the event
const ACTIVE_STATUSES = ["registered", "confirmed"];

// events stay listed for a few hours after they start so "today" doesn't vanish mid-event
const LISTED_FOR_MS = 6 * 60 * 60 * 1000;

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const formatBranchName = (branch) => {
    const name = branch?.branchName || "";
    return name.toUpperCase().startsWith("GOODSHOT") ? name.toUpperCase() : `GOODSHOT ${name}`.trim();
};

// null or 0 means the event has no cap
const hasCap = (event) => event.maxParticipants > 0;

const isRegistrationOpen = (event) => event.status === "upcoming" && event.date > new Date()
    && (!hasCap(event) || event.participantCount < event.maxParticipants);

// memberFee is the members' price when the club sets one; 0 means members pay the normal fee
const priceFor = (event, isMember) => (
    isMember && event.memberFee > 0 ? Math.min(event.memberFee, event.registrationFee) : event.registrationFee
);

// a membership counts if it covers the event's branch and is still running on the event date
const findMembership = (userId, event) => Membership.findOne({
    user: userId,
    status: "active",
    expiryDate: { $gt: event.date },
    $or: [{ branchId: event.branchId._id || event.branchId }, { allBranches: true }]
}).select("plan");

const serializeEvent = (event) => ({
    id: String(event._id),
    branchId: String(event.branchId._id || event.branchId),
    branchName: formatBranchName(event.branchId),
    title: event.title,
    description: event.description || "",
    type: event.type,
    date: event.date,
    prize: event.prize || null,
    registrationFee: event.registrationFee,
    memberFee: event.memberFee > 0 ? Math.min(event.memberFee, event.registrationFee) : null,
    maxParticipants: hasCap(event) ? event.maxParticipants : null,
    spotsLeft: hasCap(event) ? Math.max(event.maxParticipants - event.participantCount, 0) : null,
    status: event.status,
    registrationOpen: isRegistrationOpen(event)
});

const serializeRegistration = (registration) => {
    const event = registration.event;
    return {
        reference: registration.reference,
        event: event?._id ? serializeEvent(event) : null,
        isMember: registration.isMember,
        feePaid: registration.feePaid,
        status: registration.status,
        paymentAccount: serializePaymentSnapshot(registration.paymentAccount),
        transactionId: registration.transactionId,
        hasPaymentProof: Boolean(registration.paymentProof),
        paymentSubmittedAt: registration.paymentSubmittedAt,
        rejectionReason: registration.rejectionReason,
        cancelledAt: registration.cancelledAt,
        createdAt: registration.createdAt,
        canCancel: ACTIVE_STATUSES.includes(registration.status) && Boolean(event?.date > new Date())
    };
};

const summarizeRegistration = (registration) => (registration ? {
    reference: registration.reference,
    status: registration.status
} : null);

const createReference = () => {
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `EVT-${stamp}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const listedEventsQuery = () => Event.find({
    status: { $in: ["upcoming", "ongoing"] },
    date: { $gt: new Date(Date.now() - LISTED_FOR_MS) }
})
    .sort({ date: 1 })
    .populate("branchId", "branchName branchCode");

// takes a spot only while the event is open and not full
const reserveSpot = async (eventId) => {
    const result = await Event.updateOne(
        {
            _id: eventId,
            status: "upcoming",
            date: { $gt: new Date() },
            $or: [
                { maxParticipants: null },
                { maxParticipants: { $lte: 0 } },
                { $expr: { $lt: ["$participantCount", "$maxParticipants"] } }
            ]
        },
        { $inc: { participantCount: 1 } }
    );
    return result.modifiedCount === 1;
};

export const releaseSpot = (eventId) => Event.updateOne(
    { _id: eventId, participantCount: { $gt: 0 } },
    { $inc: { participantCount: -1 } }
);

const loadOwnedRegistration = (reference, userId) => TournamentReg.findOne({
    reference: String(reference || "").toUpperCase(),
    user: userId
});

const populateRegistration = (query) => query.populate({
    path: "event",
    populate: { path: "branchId", select: "branchName branchCode" }
});

// public list for the home page
export const listPublicEvents = async (req, res) => {
    try {
        const events = await listedEventsQuery();
        res.status(200).json({ events: events.map(serializeEvent) });
    } catch (error) {
        console.error("List public events error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// same list, with this client's price and registration on each event
export const listClientEvents = async (req, res) => {
    try {
        const events = await listedEventsQuery();
        const [registrations, memberships] = await Promise.all([
            TournamentReg.find({ user: req.user._id, event: { $in: events.map((event) => event._id) } }).select("event reference status"),
            Membership.find({ user: req.user._id, status: "active", expiryDate: { $gt: new Date() } }).select("branchId allBranches expiryDate")
        ]);
        const registrationByEvent = new Map(registrations.map((registration) => [String(registration.event), registration]));

        res.status(200).json({
            events: events.map((event) => {
                const branchId = String(event.branchId._id);
                const isMember = memberships.some((membership) => membership.expiryDate > event.date
                    && (membership.allBranches || String(membership.branchId) === branchId));
                return {
                    ...serializeEvent(event),
                    isMember,
                    price: priceFor(event, isMember),
                    registration: summarizeRegistration(registrationByEvent.get(String(event._id)))
                };
            })
        });
    } catch (error) {
        console.error("List client events error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getClientEvent = async (req, res) => {
    try {
        const event = isObjectId(req.params.id)
            ? await Event.findById(req.params.id).populate("branchId", "branchName branchCode paymentAccounts")
            : null;
        if (!event || event.status === "cancelled") {
            return res.status(404).json({ message: "Event not found" });
        }

        const [membership, registration] = await Promise.all([
            findMembership(req.user._id, event),
            TournamentReg.findOne({ user: req.user._id, event: event._id }).select("reference status")
        ]);

        res.status(200).json({
            event: {
                ...serializeEvent(event),
                isMember: Boolean(membership),
                memberPlan: membership ? membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1) : null,
                price: priceFor(event, Boolean(membership)),
                registration: summarizeRegistration(registration),
                paymentAccounts: (event.branchId.paymentAccounts || []).map(serializePaymentAccount)
            }
        });
    } catch (error) {
        console.error("Get client event error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// multipart request; paid events also need `paymentAccountId`, `transactionId`, and the `paymentProof` image
export const registerForEvent = async (req, res) => {
    const fail = (status, message) => {
        discardUpload(req.file);
        return res.status(status).json({ message });
    };
    let reserved = null;

    try {
        const event = isObjectId(req.params.id) ? await Event.findById(req.params.id) : null;
        if (!event || event.status === "cancelled") {
            return fail(404, "Event not found");
        }

        if (event.status !== "upcoming" || event.date <= new Date()) {
            return fail(400, "Registration for this event has closed");
        }

        const previous = await TournamentReg.findOne({ user: req.user._id, event: event._id });
        if (previous && ACTIVE_STATUSES.includes(previous.status)) {
            return fail(409, "You are already registered for this event");
        }

        const isMember = Boolean(await findMembership(req.user._id, event));
        const price = priceFor(event, isMember);
        let payment = null;
        if (price > 0) {
            const branch = await Branch.findById(event.branchId).select("paymentAccounts");
            payment = await parsePayment(branch, req.body);
            if (payment.error) {
                return fail(payment.status, payment.error);
            }
            if (!req.file) {
                return fail(400, "Upload a screenshot of your payment as proof");
            }
        } else {
            // free events need no proof
            discardUpload(req.file);
        }

        if (!await reserveSpot(event._id)) {
            return fail(409, "This event is full");
        }
        reserved = event._id;

        const fields = {
            branchId: event.branchId,
            isMember,
            feePaid: price,
            status: price > 0 ? "registered" : "confirmed",
            paymentAccount: payment ? snapshotPaymentAccount(payment.account) : {},
            transactionId: payment?.transactionId || null,
            paymentProof: payment ? req.file.filename : null,
            paymentSubmittedAt: payment ? new Date() : null,
            rejectionReason: null,
            cancelledAt: null
        };

        let registration;
        if (previous) {
            // the unique event+user index allows one document, so a cancelled or rejected one is reused
            const oldProof = previous.paymentProof;
            previous.set({ ...fields, reference: createReference() });
            registration = await previous.save();
            // the replaced screenshot is no longer linked to anything
            if (oldProof) discardUpload({ path: path.join(PAYMENT_PROOF_DIR, path.basename(oldProof)) });
        } else {
            for (let attempt = 0; attempt < 5; attempt += 1) {
                try {
                    registration = await TournamentReg.create({ ...fields, event: event._id, user: req.user._id, reference: createReference() });
                    break;
                } catch (error) {
                    if (error.code === 11000 && !error.keyPattern?.reference) {
                        // a simultaneous request from the same client got there first
                        await releaseSpot(event._id);
                        reserved = null;
                        return fail(409, "You are already registered for this event");
                    }
                    if (error.code !== 11000 || attempt === 4) throw error;
                }
            }
        }
        reserved = null;

        await populateRegistration(registration);
        res.status(201).json({ registration: serializeRegistration(registration) });
    } catch (error) {
        discardUpload(req.file);
        if (reserved) await releaseSpot(reserved).catch(() => {});
        console.error("Register for event error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listClientEventRegistrations = async (req, res) => {
    try {
        const registrations = await populateRegistration(TournamentReg.find({ user: req.user._id }).sort({ createdAt: -1 }));
        res.status(200).json({ registrations: registrations.map(serializeRegistration) });
    } catch (error) {
        console.error("List event registrations error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const cancelEventRegistration = async (req, res) => {
    try {
        const registration = await populateRegistration(loadOwnedRegistration(req.params.reference, req.user._id));
        if (!registration) {
            return res.status(404).json({ message: "Registration not found" });
        }

        if (!ACTIVE_STATUSES.includes(registration.status)) {
            return res.status(400).json({ message: "This registration is not active" });
        }

        if (!(registration.event?.date > new Date())) {
            return res.status(400).json({ message: "This event has already started" });
        }

        registration.status = "cancelled";
        registration.cancelledAt = new Date();
        await registration.save();
        await releaseSpot(registration.event._id);

        res.status(200).json({ registration: serializeRegistration(registration) });
    } catch (error) {
        console.error("Cancel event registration error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getEventRegistrationProof = async (req, res) => {
    try {
        const registration = await loadOwnedRegistration(req.params.reference, req.user._id).select("paymentProof");
        if (!registration?.paymentProof) {
            return res.status(404).json({ message: "Payment proof not found" });
        }

        sendPaymentProof(res, registration.paymentProof);
    } catch (error) {
        console.error("Get event registration proof error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
