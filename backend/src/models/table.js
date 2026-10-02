import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
    {
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },

        name: {
            type: String,
            required: true,
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

// table name must be unique within the same branch
tableSchema.index({ branchId: 1, name: 1 }, { unique: true });

export default mongoose.model("Table", tableSchema);
