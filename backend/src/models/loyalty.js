import mongoose from "mongoose";

const loyaltySchema = new mongoose.Schema(
    {
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
                type: {
                    type: String,
                    enum: ["earned", "redeemed"]
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
