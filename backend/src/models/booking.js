import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        table: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            required: true
        },

        date: {
            type: Date,
            required: true
        },

        startTime: {
            type: String,
            required: true
        },

        endTime: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "completed", "cancelled"],
            default: "pending"
        },

        advanceAmount: {
            type: Number,
            default: 0
        },

        // path to uploaded payment proof image
        paymentProof: {
            type: String,
            default: null
        },

        rejectionReason: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Booking", bookingSchema);
