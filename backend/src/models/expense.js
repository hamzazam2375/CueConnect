import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        description: {
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
            enum: ["rent", "utilities", "equipment", "salary", "maintenance", "other"],
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "online", "card"],
            default: null
        },

        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

export default mongoose.model("Expense", expenseSchema);
