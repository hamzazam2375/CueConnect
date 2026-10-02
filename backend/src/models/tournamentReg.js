import mongoose from "mongoose";

const tournamentRegSchema = new mongoose.Schema(
    {
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

        isMember: {
            type: Boolean,
            default: false
        },

        feePaid: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: ["registered", "confirmed", "cancelled"],
            default: "registered"
        }
    },
    {
        timestamps: true
    }
);

// one registration per user per event
tournamentRegSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model("TournamentReg", tournamentRegSchema);
