import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        // what this payment is for
        type: {
            type: String,
            enum: ["game", "booking", "membership", "event"],
            required: true
        },

        // reference to the related document (game, booking, membership, or event)
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        amount: {
            type: Number,
            required: true
        },

        method: {
            type: String,
            enum: ["cash", "online", "card"],
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "completed", "refunded"],
            default: "pending"
        },

        // path to uploaded payment proof (for online payments)
        paymentProof: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Payment", paymentSchema);
