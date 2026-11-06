import mongoose from "mongoose";
import { MEMBERSHIP_PLANS } from "./branch.js";

const membershipSchema = new mongoose.Schema(
    {
        // short code shown to clients, e.g. MEM-20261106-1A2B3C4D
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

        plan: {
            type: String,
            enum: MEMBERSHIP_PLANS,
            required: true
        },

        // plan terms copied from the branch when the client applied
        price: {
            type: Number,
            required: true
        },

        discount: {
            type: Number,
            required: true
        },

        durationMonths: {
            type: Number,
            required: true
        },

        allBranches: {
            type: Boolean,
            default: false
        },

        rules: {
            type: String,
            default: null
        },

        // pending: waiting for admin to verify the payment
        // active: approved; benefits apply until expiryDate (then it reads as expired)
        status: {
            type: String,
            enum: ["pending", "active", "expired", "rejected", "cancelled"],
            default: "pending"
        },

        // set when the admin approves the payment
        startDate: {
            type: Date,
            default: null
        },

        expiryDate: {
            type: Date,
            default: null
        },

        // branch payment account the client paid to
        paymentAccount: {
            method: { type: String, default: null },
            provider: { type: String, default: null },
            accountTitle: { type: String, default: null },
            accountNumber: { type: String, default: null }
        },

        transactionId: {
            type: String,
            default: null
        },

        // file name of the uploaded payment proof inside uploads/payment-proofs
        paymentProof: {
            type: String,
            default: null
        },

        paymentSubmittedAt: {
            type: Date,
            default: null
        },

        rejectionReason: {
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

membershipSchema.index({ user: 1, createdAt: -1 });
membershipSchema.index({ branchId: 1, status: 1 });

export default mongoose.model("Membership", membershipSchema);
