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
        },

        address: {
            type: String,
            trim: true,
            default: ""
        },

        phone: {
            type: String,
            trim: true,
            default: ""
        },

        // minutes after midnight; values of 1440+ are after midnight (e.g. 1560 = 2:00 AM)
        openingTime: {
            type: Number,
            default: 12 * 60,
            min: 0
        },

        closingTime: {
            type: Number,
            default: 26 * 60,
            min: 1
        },

        // accounts clients send booking advances to
        paymentAccounts: [
            {
                method: {
                    type: String,
                    enum: ["jazzcash", "easypaisa", "bank"],
                    required: true
                },
                // bank name for bank transfers
                provider: {
                    type: String,
                    trim: true,
                    default: null
                },
                accountTitle: {
                    type: String,
                    required: true,
                    trim: true
                },
                accountNumber: {
                    type: String,
                    required: true,
                    trim: true
                }
            }
        ],

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
