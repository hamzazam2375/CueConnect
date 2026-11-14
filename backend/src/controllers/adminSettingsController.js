import bcrypt from "bcrypt";
import Branch from "../models/branch.js";
import User from "../models/user.js";
import { serializePaymentAccount } from "../utils/payments.js";
import { adminPasswordError } from "../utils/passwordPolicy.js";

const METHODS = ["jazzcash", "easypaisa", "bank"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^\+?[0-9][0-9\s-]{8,18}$/;

const loadBranch = (req) => Branch.findById(req.user.branchId);

const serializeBranch = (branch) => ({
    id: String(branch._id),
    branchName: branch.branchName,
    branchCode: branch.branchCode,
    address: branch.address || "",
    phone: branch.phone || "",
    openingTime: Number(branch.openingTime ?? 12 * 60),
    closingTime: Number(branch.closingTime ?? 26 * 60),
    paymentAccounts: (branch.paymentAccounts || []).map(serializePaymentAccount)
});

const serializeAdmin = (user) => ({
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || ""
});

export const getSettings = async (req, res) => {
    try {
        const branch = await loadBranch(req);
        if (!branch) return res.status(404).json({ message: "Branch not found" });
        res.status(200).json({
            branch: serializeBranch(branch),
            admin: serializeAdmin(req.user)
        });
    } catch (error) {
        console.error("Get settings error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateBranchSettings = async (req, res) => {
    try {
        const branch = await loadBranch(req);
        if (!branch) return res.status(404).json({ message: "Branch not found" });

        const branchName = String(req.body.branchName || "").trim();
        if (!branchName) return res.status(400).json({ message: "Branch name is required" });

        const phone = String(req.body.phone || "").trim();
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Enter a valid branch phone number" });
        }

        const openingTime = Number(req.body.openingTime);
        let closingTime = Number(req.body.closingTime);
        if (!Number.isInteger(openingTime) || openingTime < 0 || openingTime >= 24 * 60) {
            return res.status(400).json({ message: "Choose a valid opening time" });
        }
        // midnight (0) is a valid closing time; it rolls over to the next day below
        if (!Number.isInteger(closingTime) || closingTime < 0 || closingTime > 48 * 60) {
            return res.status(400).json({ message: "Choose a valid closing time" });
        }
        // bookings are sold in whole hours, so the club must open and close on the hour
        if (openingTime % 60 !== 0 || closingTime % 60 !== 0) {
            return res.status(400).json({ message: "Opening and closing times must be on the hour (e.g. 12:00, 02:00)" });
        }
        if (closingTime <= openingTime) closingTime += 24 * 60;
        if (closingTime - openingTime < 60 || closingTime - openingTime > 18 * 60) {
            return res.status(400).json({ message: "Club hours must be between 1 and 18 hours" });
        }

        branch.branchName = branchName;
        branch.address = String(req.body.address || "").trim();
        branch.phone = phone;
        branch.openingTime = openingTime;
        branch.closingTime = closingTime;
        await branch.save();

        res.status(200).json({ message: "Branch settings saved", branch: serializeBranch(branch) });
    } catch (error) {
        console.error("Update branch settings error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

const validateAccount = (body) => {
    const method = String(body.method || "");
    const accountTitle = String(body.accountTitle || "").trim();
    const accountNumber = String(body.accountNumber || "").trim();
    const provider = String(body.provider || "").trim();
    if (!METHODS.includes(method)) return { error: "Payment method must be JazzCash, Easypaisa, or bank" };
    if (!accountTitle || !accountNumber) return { error: "Account title and number are required" };
    if (method === "bank" && !provider) return { error: "Bank name is required for bank transfers" };
    return { method, provider: method === "bank" ? provider : null, accountTitle, accountNumber };
};

export const addPaymentAccount = async (req, res) => {
    try {
        const branch = await loadBranch(req);
        if (!branch) return res.status(404).json({ message: "Branch not found" });
        const parsed = validateAccount(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        branch.paymentAccounts.push(parsed);
        await branch.save();
        res.status(201).json({ message: "Payment account added", branch: serializeBranch(branch) });
    } catch (error) {
        console.error("Add payment account error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updatePaymentAccount = async (req, res) => {
    try {
        const branch = await loadBranch(req);
        if (!branch) return res.status(404).json({ message: "Branch not found" });
        const account = branch.paymentAccounts.id(req.params.accountId);
        if (!account) return res.status(404).json({ message: "Payment account not found" });
        const parsed = validateAccount(req.body);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        account.method = parsed.method;
        account.provider = parsed.provider;
        account.accountTitle = parsed.accountTitle;
        account.accountNumber = parsed.accountNumber;
        await branch.save();
        res.status(200).json({ message: "Payment account updated", branch: serializeBranch(branch) });
    } catch (error) {
        console.error("Update payment account error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const deletePaymentAccount = async (req, res) => {
    try {
        const branch = await loadBranch(req);
        if (!branch) return res.status(404).json({ message: "Branch not found" });
        const account = branch.paymentAccounts.id(req.params.accountId);
        if (!account) return res.status(404).json({ message: "Payment account not found" });
        branch.paymentAccounts.pull(req.params.accountId);
        await branch.save();
        res.status(200).json({ message: "Payment account removed", branch: serializeBranch(branch) });
    } catch (error) {
        console.error("Delete payment account error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateAdminProfile = async (req, res) => {
    try {
        const firstName = String(req.body.firstName || "").trim();
        const lastName = String(req.body.lastName || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const phone = String(req.body.phone || "").trim();

        if (!firstName || !lastName) return res.status(400).json({ message: "First and last name are required" });
        if (!emailRegex.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
        if (phone && !phoneRegex.test(phone)) return res.status(400).json({ message: "Enter a valid phone number" });

        const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (taken) return res.status(409).json({ message: "An account with this email already exists" });

        const user = await User.findById(req.user._id);
        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.phone = phone;
        await user.save();

        res.status(200).json({ message: "Profile updated", admin: serializeAdmin(user) });
    } catch (error) {
        console.error("Update admin profile error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }
        const weakPassword = adminPasswordError(newPassword);
        if (weakPassword) return res.status(400).json({ message: weakPassword });
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from your current password" });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).json({ message: "Password changed" });
    } catch (error) {
        console.error("Update admin password error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
