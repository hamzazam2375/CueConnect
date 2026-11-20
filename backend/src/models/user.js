import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 20,
            default: ""
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["admin", "client"],
            default: "client"
        },

        // clients must confirm their email with a code before they can sign in;
        // accounts from before this existed start unverified and confirm on their next sign in
        emailVerified: {
            type: Boolean,
            default: false
        },

        // the current verification code (hashed) and its limits; never sent to clients
        emailCodeHash: { type: String, select: false },
        emailCodeExpiresAt: { type: Date, select: false },
        emailCodeAttempts: { type: Number, select: false },
        emailCodeSentAt: { type: Date, select: false },

        // the current password reset code (hashed) and its limits; never sent to clients
        resetCodeHash: { type: String, select: false },
        resetCodeExpiresAt: { type: Date, select: false },
        resetCodeAttempts: { type: Number, select: false },
        resetCodeSentAt: { type: Date, select: false },

        // set when the password is reset; sessions signed in before this stop working
        passwordChangedAt: { type: Date, default: null },

        customerCode: {
            type: String,
            unique: true,
            sparse: true,
            uppercase: true,
            trim: true
        },

        isActive: {
            type: Boolean,
            default: true
        },

        // which branch this admin belongs to (null for clients)
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("User", userSchema);
