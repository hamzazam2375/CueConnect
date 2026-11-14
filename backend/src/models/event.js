import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        date: {
            type: Date,
            required: true
        },

        type: {
            type: String,
            enum: ["tournament", "event"],
            required: true
        },

        maxParticipants: {
            type: Number,
            default: null
        },

        registrationFee: {
            type: Number,
            default: 0
        },

        // e.g. "PKR 25,000" or "Trophy + PKR 10,000"
        prize: {
            type: String,
            trim: true,
            default: null
        },

        // registrations holding a spot (registered or confirmed); kept in step atomically
        // so maxParticipants can't be overshot by simultaneous sign-ups
        participantCount: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
            default: "upcoming"
        },

        archived: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Event", eventSchema);
