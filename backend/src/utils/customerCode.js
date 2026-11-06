import crypto from "crypto";
import User from "../models/user.js";
import { customerCode } from "./billMath.js";

export const displayCustomerCode = (user) => user?.customerCode || customerCode(user?._id);

export const allocateCustomerCode = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const code = `CC${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const taken = await User.exists({ customerCode: code });
        if (!taken) return code;
    }
    throw new Error("Could not allocate a unique customer ID");
};
