import mongoose from "mongoose";

const tournamentRegSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // shown to the client and the club, e.g. EVT-20261106-1A2B3C4D
        reference: {
            type: String,
            required: true,
            unique: true
        },

        isMember: {
            type: Boolean,
            default: false
        },

        feePaid: {
            type: Number,
            required: true
        },

        // registered: paid, waiting for the club to verify the payment
        // confirmed: spot secured (free events are confirmed straight away)
        // rejected: the club could not verify the payment
        status: {
            type: String,
            enum: ["registered", "confirmed", "rejected", "cancelled"],
            default: "registered"
        },

        // payment details for paid events, same flow as bookings and memberships
        paymentAccount: {
            method: { type: String, default: null },
            provider: { type: String, default: null },
            accountTitle: { type: String, default: null },
            accountNumber: { type: String, default: null }
        },

        transactionId: {
            type: String,
            trim: true,
            uppercase: true,
            default: null
        },

        paymentProof: {
            type: String,
            default: null
        },

        paymentSubmittedAt: {
            type: Date,
            default: null
        },

        rejectionReason: {
            type: String,
            trim: true,
            default: null
        },

        cancelledAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// one registration per user per event
tournamentRegSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model("TournamentReg", tournamentRegSchema);
