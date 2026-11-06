import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
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

        totalAmount: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

billSchema.index({ branchId: 1, status: 1, payerUser: 1 });
billSchema.index({ branchId: 1, status: 1, payerName: 1 });

export default mongoose.model("Bill", billSchema);
