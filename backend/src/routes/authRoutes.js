import express from "express";
import { verifyAdminKey, verifyOtp, resendOtp, registerAdmin, registerClient, clientLogin, adminLogin, logout, getMe, updateClientProfile, changeClientPassword } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// admin registration (multi-step)
router.post("/admin/verify-key", verifyAdminKey);   // step 1: verify secret key → send OTP
router.post("/admin/verify-otp", verifyOtp);         // step 1b: verify OTP → get tempToken
router.post("/admin/resend-otp", resendOtp);         // resend OTP
router.post("/admin/register", registerAdmin);       // step 2: complete registration

// client registration & login
router.post("/client/register", registerClient);
router.post("/client/login", clientLogin);

// admin login
router.post("/admin/login", adminLogin);

router.patch("/client/profile", protect, authorize("client"), updateClientProfile);
router.patch("/client/password", protect, authorize("client"), changeClientPassword);

// logout (requires being logged in)
router.post("/logout", protect, logout);

// list all branches (used during admin signup step 2)
router.get("/branches", async (req, res) => {
    try {
        const { default: Branch } = await import("../models/branch.js");
        const branches = await Branch.find().select("branchName branchCode").sort({ branchName: 1 });
        res.status(200).json({ branches });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
});

// session restore
router.get("/me", protect, getMe);

export default router;

