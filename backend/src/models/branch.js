import mongoose from "mongoose";
import crypto from "crypto";

const branchSchema = new mongoose.Schema(
    {
        branchName: {
            type: String,
            required: true,
            trim: true
        },

        branchCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true
        }
    },
    {
        timestamps: true
    }
);

// generate a unique 6-character branch code
branchSchema.statics.generateCode = async function () {
    let code;
    let exists = true;

    while (exists) {
        code = crypto.randomBytes(3).toString("hex").toUpperCase();
        exists = await this.findOne({ branchCode: code });
    }

    return code;
};

export default mongoose.model("Branch", branchSchema);
