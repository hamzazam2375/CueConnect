import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { getAuthCookie } from "../utils/authCookie.js";

export const protect = async (req, res, next) => {
    try {
        const token = getAuthCookie(req);

        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({ message: "Authentication required" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Authentication required" });
        }

        next(error);
    }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You are not authorized to access this resource" });
    }

    next();
};
