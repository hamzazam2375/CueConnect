import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        table: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Table",
            required: true
        },

        // registered user (null for walk-in customers)
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        type: {
            type: String,
            enum: ["frame", "century"],
            required: true
        },

        // who is paying for this game
        payer: {
            type: String,
            required: true,
            trim: true
        },

        startTime: {
            type: Date,
            required: true
        },

        endTime: {
            type: Date,
            default: null
        },

        // duration in minutes, calculated when game ends
        duration: {
            type: Number,
            default: 0
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        discountApplied: {
            type: Number,
            default: 0
        },

        finalAmount: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Game", gameSchema);
