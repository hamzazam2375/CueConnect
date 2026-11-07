import mongoose from "mongoose";
import crypto from "crypto";

export const MEMBERSHIP_PLANS = ["silver", "gold", "platinum"];

const DEFAULT_MEMBERSHIP_PLANS = [
    { plan: "silver", price: 2500, discount: 10, durationMonths: 1, allBranches: false, rules: "Valid for one branch only. 10% off on hourly rates." },
    { plan: "gold", price: 4500, discount: 20, durationMonths: 1, allBranches: false, rules: "Valid for one branch. 20% off on hourly rates. Priority booking." },
    { plan: "platinum", price: 8000, discount: 30, durationMonths: 1, allBranches: true, rules: "Valid for all branches. 30% off on all rates. Free tournament entry." }
];

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

        // plans clients can buy at this branch; new branches start with the default plans
        membershipPlans: {
            type: [
                {
                    plan: {
                        type: String,
                        enum: MEMBERSHIP_PLANS,
                        required: true
                    },
                    price: {
                        type: Number,
                        required: true,
                        min: 0
                    },
                    // percent off play at the club
                    discount: {
                        type: Number,
                        required: true,
                        min: 0,
                        max: 100
                    },
                    durationMonths: {
                        type: Number,
                        default: 1,
                        min: 1
                    },
                    // valid at every branch, not just this one
                    allBranches: {
                        type: Boolean,
                        default: false
                    },
                    rules: {
                        type: String,
                        trim: true,
                        default: ""
                    }
                }
            ],
            default: () => DEFAULT_MEMBERSHIP_PLANS.map((plan) => ({ ...plan }))
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
