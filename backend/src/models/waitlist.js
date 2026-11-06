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

        // the wanted slot, stored like Booking: midnight UTC of the day plus minutes after midnight
        date: {
            type: Date,
            required: true
        },

        startTime: {
            type: Number,
            required: true
        },

        endTime: {
            type: Number,
            required: true
        },

        // hours
        duration: {
            type: Number,
            required: true
        },

        // waiting: slot still taken; notified: slot came free and the client was told;
        // booked: the client booked it; cancelled: the client left the waitlist.
        // waiting/notified entries whose slot has started read as expired.
        status: {
            type: String,
            enum: ["waiting", "notified", "booked", "expired", "cancelled"],
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

// freed slots look up waiting entries for one table on one day
waitlistSchema.index({ table: 1, date: 1, status: 1 });
waitlistSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Waitlist", waitlistSchema);
