import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            required: true,
            trim: true
        },

        amount: {
            type: Number,
            required: true
        },

        category: {
            type: String,
            enum: ["game", "booking", "membership", "event", "other"],
            required: true
        },

        date: {
            type: Date,
            default: Date.now
        },

        notes: {
            type: String,
            trim: true,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Income", incomeSchema);
