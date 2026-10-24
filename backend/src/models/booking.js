import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        // short code shown to clients, e.g. CC-20261024-1A2B3C4D
        reference: {
            type: String,
            required: true,
            unique: true
        },

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

        // the booking day, stored as midnight UTC of that calendar date
        date: {
            type: Date,
            required: true
        },

        // minutes after midnight of `date`; values above 1440 fall after midnight (e.g. 1500 = 1:00 AM)
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

        // table price per hour when the booking was made or last changed
        hourlyRate: {
            type: Number,
            required: true
        },

        totalAmount: {
            type: Number,
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
        },

        cancellationReason: {
            type: String,
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

// overlap checks look up active bookings for one table on one day
bookingSchema.index({ table: 1, date: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
