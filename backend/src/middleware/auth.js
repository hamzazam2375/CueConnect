import jwt from "jsonwebtoken";
import User from "../models/user.js";

// verify JWT from cookie and attach user (with branchId) to request
export const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        // req.user now has: _id, role, branchId, firstName, lastName, email
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// check if user has the required role
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "You do not have permission to access this" });
        }
        next();
    };
};

// verify that a document belongs to the admin's branch
// use this before update/delete/get-by-id operations
export const verifyBranchOwnership = (model) => {
    return async (req, res, next) => {
        try {
            const doc = await model.findById(req.params.id);

            if (!doc) {
                return res.status(404).json({ message: "Resource not found" });
            }

            if (doc.branchId.toString() !== req.user.branchId.toString()) {
                return res.status(403).json({ message: "You do not have access to this resource" });
            }

            // attach the document so controllers don't need to query again
            req.doc = doc;
            next();
        } catch {
            return res.status(500).json({ message: "Server error" });
        }
    };
};
