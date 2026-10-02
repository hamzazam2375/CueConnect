import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["available", "occupied", "maintenance"],
            default: "available"
        },

        pricePerHour: {
            type: Number,
            required: true
        },

        frameRate: {
            type: Number,
            required: true
        },

        centuryRate: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Table", tableSchema);
