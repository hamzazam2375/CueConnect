import jwt from "jsonwebtoken";

const COOKIE_NAME = "cueconnect_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/"
});

export const createAuthToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

export const setAuthCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, {
        ...cookieOptions(),
        maxAge: COOKIE_MAX_AGE
    });
};

export const clearAuthCookie = (res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions());
};

export const getAuthCookie = (req) => req.cookies?.[COOKIE_NAME];
