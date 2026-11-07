import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        source: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
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

        sourceType: {
            type: String,
            enum: ["booking", "frame", "century", "tournament", "other"],
            default: "other"
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "online", "card"],
            default: null
        },

        status: {
            type: String,
            enum: ["completed", "refunded"],
            default: "completed"
        },

        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null
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

incomeSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
incomeSchema.index({ branchId: 1, date: -1 });

export default mongoose.model("Income", incomeSchema);
