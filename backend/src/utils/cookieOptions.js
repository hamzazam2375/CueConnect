const isProd = process.env.NODE_ENV === "production";

// Local HTTP uses SameSite=Lax. Render (HTTPS) uses None so the
// hosted site and localhost frontend can both send credentials.
export const authCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

export const clearAuthCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/"
};
