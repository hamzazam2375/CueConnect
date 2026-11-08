import crypto from "crypto";
import User from "../models/user.js";
import { sendOtpEmail } from "./emailService.js";

export const CODE_TTL_MINUTES = 10;
const CODE_TTL_MS = CODE_TTL_MINUTES * 60 * 1000;
const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

// codes are stored hashed, tied to the account, so a leaked database row can't be replayed elsewhere
const hashCode = (userId, code) => crypto.createHash("sha256").update(`${userId}:${code}`).digest("hex");

const CODE_FIELDS = "+emailCodeHash +emailCodeExpiresAt +emailCodeAttempts +emailCodeSentAt";

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const findClientForVerification = (email) => User.findOne({ email: normalizeEmail(email), role: "client" }).select(CODE_FIELDS);

// seconds until another code may be sent; 0 when it can go now
export const resendWait = (user) => {
    const sentAt = user.emailCodeSentAt?.getTime() || 0;
    return Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
};

// Emails a fresh 6-digit code, replacing any earlier one. `user` must be loaded with CODE_FIELDS.
// Resolves to true when the email went out.
export const sendVerificationCode = async (user) => {
    const code = crypto.randomInt(100000, 1000000).toString();
    user.emailCodeHash = hashCode(user._id, code);
    user.emailCodeExpiresAt = new Date(Date.now() + CODE_TTL_MS);
    user.emailCodeAttempts = 0;
    user.emailCodeSentAt = new Date();
    await user.save();

    try {
        await sendOtpEmail(user.email, code, {
            subtitle: "Email Verification",
            intro: "Use the code below to verify your email and sign in to CueConnect.",
            expiresInMinutes: CODE_TTL_MINUTES
        });
        return true;
    } catch (error) {
        console.error("Verification email error:", error.message);
        return false;
    }
};

// Checks a code for this client; on success marks the email verified.
// Resolves to { user } or { status, error }.
export const confirmVerificationCode = async (email, code) => {
    const user = await findClientForVerification(email);
    if (!user) {
        return { status: 400, error: "Invalid or expired code. Request a new one" };
    }
    if (user.emailVerified) {
        return { user };
    }
    if (!user.emailCodeHash || !user.emailCodeExpiresAt || user.emailCodeExpiresAt <= new Date()) {
        return { status: 410, error: "This code has expired. Request a new one" };
    }
    if (user.emailCodeAttempts >= MAX_ATTEMPTS) {
        return { status: 429, error: "Too many wrong attempts. Request a new code" };
    }

    const given = String(code || "").trim();
    const matches = /^\d{6}$/.test(given) && crypto.timingSafeEqual(
        Buffer.from(hashCode(user._id, given)),
        Buffer.from(user.emailCodeHash)
    );
    if (!matches) {
        user.emailCodeAttempts += 1;
        await user.save();
        const left = MAX_ATTEMPTS - user.emailCodeAttempts;
        return {
            status: left > 0 ? 400 : 429,
            error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "attempt" : "attempts"} left` : "Too many wrong attempts. Request a new code"
        };
    }

    user.emailVerified = true;
    user.emailCodeHash = undefined;
    user.emailCodeExpiresAt = undefined;
    user.emailCodeAttempts = undefined;
    await user.save();
    return { user };
};
