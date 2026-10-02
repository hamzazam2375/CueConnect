import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
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

        // discounted fee for members
        memberFee: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
            default: "upcoming"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Event", eventSchema);
