import mongoose from "mongoose";

const discountItemSchema = new mongoose.Schema({
    type: { type: String, enum: ["membership", "loyalty", "hourly", "weekly"], required: true },
    name: { type: String, required: true },
    percent: { type: Number, required: true },
    amount: { type: Number, required: true }
}, { _id: false });

const billSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        reference: {
            type: String,
            required: true,
            unique: true
        },

        payerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        payerName: {
            type: String,
            required: true,
            trim: true
        },

        games: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Game"
        }],

        originalAmount: {
            type: Number,
            default: 0
        },

        discountAmount: {
            type: Number,
            default: 0
        },

        discountBreakdown: {
            type: [discountItemSchema],
            default: []
        },

        totalAmount: {
            type: Number,
            default: 0
        },

        paidAmount: {
            type: Number,
            default: 0
        },

        remainingBalance: {
            type: Number,
            default: 0
        },

        lastPaymentMethod: {
            type: String,
            enum: ["cash", "online", "card"],
            default: null
        },

        status: {
            type: String,
            enum: ["pending", "partial", "paid"],
            default: "pending"
        },

        paidAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

billSchema.index({ branchId: 1, status: 1, payerUser: 1 });
billSchema.index({ branchId: 1, status: 1, payerName: 1 });

export default mongoose.model("Bill", billSchema);
