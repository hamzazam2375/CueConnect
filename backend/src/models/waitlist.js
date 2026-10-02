import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
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

        timeSlot: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["waiting", "notified", "booked", "expired"],
            default: "waiting"
        },

        notifiedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Waitlist", waitlistSchema);
