import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
    {
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
