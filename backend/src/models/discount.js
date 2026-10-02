import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: ["hourly", "weekly", "loyalty"],
            required: true
        },

        // discount percentage (e.g. 10 means 10% off)
        value: {
            type: Number,
            required: true
        },

        // minimum loyalty points needed (for loyalty type)
        minPoints: {
            type: Number,
            default: 0
        },

        // applicable days for weekly discounts (e.g. ["monday", "tuesday"])
        applicableDays: {
            type: [String],
            default: []
        },

        // applicable hours for hourly discounts (e.g. "14:00-17:00")
        applicableHours: {
            type: String,
            default: null
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Discount", discountSchema);
