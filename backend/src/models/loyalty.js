import mongoose from "mongoose";

const loyaltySchema = new mongoose.Schema(
    {
        // branch where the client first earned points; the balance itself is usable at every branch
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        points: {
            type: Number,
            default: 0
        },

        history: [
            {
                // refunded: redeemed points given back, e.g. when a booking is cancelled
                type: {
                    type: String,
                    enum: ["earned", "redeemed", "refunded"]
                },

                points: {
                    type: Number,
                    required: true
                },

                description: {
                    type: String,
                    trim: true
                },

                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Loyalty", loyaltySchema);
