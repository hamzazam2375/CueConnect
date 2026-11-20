import crypto from "crypto";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import { sendOtpEmail } from "./emailService.js";
import { normalizeEmail } from "./emailVerification.js";

export const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_TTL_MS = RESET_CODE_TTL_MINUTES * 60 * 1000;
const MAX_ATTEMPTS = 5;
export const RESET_COOLDOWN_SECONDS = 60;

// kept apart from the email verification code so one can never be used as the other
const hashCode = (userId, code) => crypto.createHash("sha256").update(`reset:${userId}:${code}`).digest("hex");

const RESET_FIELDS = "+resetCodeHash +resetCodeExpiresAt +resetCodeAttempts +resetCodeSentAt";

export const findUserForReset = (email, role) => User.findOne({ email: normalizeEmail(email), role }).select(RESET_FIELDS);

// seconds until another reset code may be sent; 0 when it can go now
export const resetWait = (user) => {
    const sentAt = user.resetCodeSentAt?.getTime() || 0;
    return Math.max(0, Math.ceil((sentAt + RESET_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
};

// Emails a fresh 6-digit reset code, replacing any earlier one. Resolves to true when the email went out.
export const sendResetCode = async (user) => {
    const code = crypto.randomInt(100000, 1000000).toString();
    user.resetCodeHash = hashCode(user._id, code);
    user.resetCodeExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    user.resetCodeAttempts = 0;
    user.resetCodeSentAt = new Date();
    await user.save();

    try {
        await sendOtpEmail(user.email, code, {
            subject: "Your CueConnect password reset code",
            subtitle: "Password Reset",
            intro: "Use the code below to choose a new password for your CueConnect account.",
            footnote: "If you didn't ask to reset your password, you can ignore this email. Your password stays the same.",
            expiresInMinutes: RESET_CODE_TTL_MINUTES
        });
        return true;
    } catch (error) {
        console.error("Password reset email error:", error.message);
        return false;
    }
};

// Checks the code and, when it matches, sets the new password and signs out every existing session.
// Resolves to { user } or { status, error }.
export const resetPasswordWithCode = async ({ email, role, code, newPassword }) => {
    const expired = { status: 400, error: "Invalid or expired code. Request a new one" };
    const user = await findUserForReset(email, role);
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
        return expired;
    }
    if (user.resetCodeExpiresAt <= new Date()) {
        return { status: 410, error: "This code has expired. Request a new one" };
    }
    if (user.resetCodeAttempts >= MAX_ATTEMPTS) {
        return { status: 429, error: "Too many wrong attempts. Request a new code" };
    }

    const given = String(code || "").trim();
    const matches = /^\d{6}$/.test(given) && crypto.timingSafeEqual(
        Buffer.from(hashCode(user._id, given)),
        Buffer.from(user.resetCodeHash)
    );
    if (!matches) {
        user.resetCodeAttempts += 1;
        await user.save();
        const left = MAX_ATTEMPTS - user.resetCodeAttempts;
        return {
            status: left > 0 ? 400 : 429,
            error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "attempt" : "attempts"} left` : "Too many wrong attempts. Request a new code"
        };
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    // the code reached their inbox, which proves they own the email
    if (user.role === "client") user.emailVerified = true;
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    user.resetCodeAttempts = undefined;
    await user.save();
    return { user };
};
