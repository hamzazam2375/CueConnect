import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
    {
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
            enum: ["silver", "gold", "platinum"],
            required: true
        },

        price: {
            type: Number,
            required: true
        },

        discount: {
            type: Number,
            required: true
        },

        startDate: {
            type: Date,
            default: Date.now
        },

        expiryDate: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ["active", "expired"],
            default: "active"
        },

        rules: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Membership", membershipSchema);
