import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Branch from "../models/branch.js";
import { sendOtpEmail } from "../services/emailService.js";

// track failed secret key attempts per IP
const attemptTracker = new Map();

const LOCKOUT_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_ATTEMPTS = 2;

// in-memory OTP store: email -> { otp, password, expiresAt, attempts }
const otpStore = new Map();
const OTP_EXPIRY = 5 * 60 * 1000;  // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

const serializeAuthUser = (user) => ({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    branchId: user.branchId || null,
    createdAt: user.createdAt
});

// generate a 6-digit OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// step 1: verify email, password, and secret key → send OTP
export const verifyAdminKey = async (req, res) => {
    try {
        const { email, password, secretKey } = req.body;
        const ip = req.ip;

        // check if this IP is currently locked out
        const tracker = attemptTracker.get(ip);
        if (tracker && tracker.lockedUntil) {
            const remaining = tracker.lockedUntil - Date.now();
            if (remaining > 0) {
                const seconds = Math.ceil(remaining / 1000);
                return res.status(429).json({
                    message: `Too many failed attempts. Try again in ${seconds} seconds`
                });
            }
            // lockout expired, reset
            attemptTracker.delete(ip);
        }

        if (!email || !password || !secretKey) {
            return res.status(400).json({ message: "Email, password and secret key are required" });
        }

        // validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        // validate password strength
        const pwErrors = [];
        if (password.length < 8) pwErrors.push("at least 8 characters");
        if (!/[A-Z]/.test(password)) pwErrors.push("one uppercase letter");
        if (!/[a-z]/.test(password)) pwErrors.push("one lowercase letter");
        if (!/\d/.test(password)) pwErrors.push("one digit");
        if (!/[^A-Za-z0-9]/.test(password)) pwErrors.push("one special character");
        if (pwErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${pwErrors.join(", ")}`
            });
        }

        // verify secret key
        if (secretKey !== process.env.ADMIN_SECRET_KEY) {
            const current = attemptTracker.get(ip) || { attempts: 0, lockedUntil: null };
            current.attempts += 1;

            if (current.attempts >= MAX_ATTEMPTS) {
                current.lockedUntil = Date.now() + LOCKOUT_DURATION;
                attemptTracker.set(ip, current);
                return res.status(429).json({
                    message: "Key entered is incorrect. Too many failed attempts, try again after 2 minutes"
                });
            }

            attemptTracker.set(ip, current);
            return res.status(401).json({
                message: `Key entered is incorrect. ${MAX_ATTEMPTS - current.attempts} attempt(s) remaining`
            });
        }

        // key correct, reset attempts
        attemptTracker.delete(ip);

        // check if email already taken
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        // generate and store OTP
        const otp = generateOtp();
        otpStore.set(email, {
            otp,
            password,
            expiresAt: Date.now() + OTP_EXPIRY,
            attempts: 0
        });

        // auto-cleanup after expiry
        setTimeout(() => {
            const entry = otpStore.get(email);
            if (entry && entry.otp === otp) otpStore.delete(email);
        }, OTP_EXPIRY + 1000);

        // send OTP via email
        await sendOtpEmail(email, otp);

        res.status(200).json({
            message: "Verification code sent to your email",
            email
        });
    } catch (error) {
        console.error("Admin key verification error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// step 1b: verify the OTP → issue tempToken
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const entry = otpStore.get(email);

        if (!entry) {
            return res.status(400).json({ message: "No verification code found. Please request a new one" });
        }

        // check expiry
        if (Date.now() > entry.expiresAt) {
            otpStore.delete(email);
            return res.status(410).json({ message: "Verification code has expired. Please request a new one" });
        }

        // check max attempts
        entry.attempts += 1;
        if (entry.attempts > OTP_MAX_ATTEMPTS) {
            otpStore.delete(email);
            return res.status(429).json({ message: "Too many failed attempts. Please request a new code" });
        }

        // verify OTP
        if (entry.otp !== otp) {
            const remaining = OTP_MAX_ATTEMPTS - entry.attempts;
            return res.status(401).json({
                message: `Invalid code. ${remaining} attempt(s) remaining`
            });
        }

        // OTP correct — clean up and issue tempToken
        const { password } = entry;
        otpStore.delete(email);

        const tempToken = jwt.sign(
            { email, password },
            process.env.JWT_SECRET,
            { expiresIn: "5m" }
        );

        res.status(200).json({
            message: "Email verified successfully",
            tempToken
        });
    } catch (error) {
        console.error("OTP verification error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// resend OTP (re-generates and sends a new code)
export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const entry = otpStore.get(email);
        if (!entry) {
            return res.status(400).json({ message: "No pending verification found. Please start registration again" });
        }

        // generate new OTP
        const otp = generateOtp();
        entry.otp = otp;
        entry.expiresAt = Date.now() + OTP_EXPIRY;
        entry.attempts = 0;

        // send new OTP
        await sendOtpEmail(email, otp);

        res.status(200).json({ message: "New verification code sent to your email" });
    } catch (error) {
        console.error("Resend OTP error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// step 2: complete registration with name and branch (create new or join existing)
export const registerAdmin = async (req, res) => {
    try {
        const { firstName, lastName, tempToken, branchAction, branchName, branchCode } = req.body;

        if (!firstName || !lastName || !tempToken) {
            return res.status(400).json({ message: "First name, last name and token are required" });
        }

        if (!branchAction || !["create", "join"].includes(branchAction)) {
            return res.status(400).json({ message: "branchAction must be 'create' or 'join'" });
        }

        // verify temp token from step 1
        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Session expired. Please start registration again" });
        }

        // double check email isn't taken
        const existingUser = await User.findOne({ email: decoded.email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        let branch;

        if (branchAction === "create") {
            // create a new branch
            if (!branchName) {
                return res.status(400).json({ message: "Branch name is required to create a new branch" });
            }

            const generatedCode = await Branch.generateCode();
            branch = await Branch.create({
                branchName,
                branchCode: generatedCode
            });
        } else {
            // join an existing branch
            if (!branchCode) {
                return res.status(400).json({ message: "Branch code is required to join an existing branch" });
            }

            branch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
            if (!branch) {
                return res.status(404).json({ message: "Invalid branch code. No branch found" });
            }
        }

        // hash password
        const hashedPassword = await bcrypt.hash(decoded.password, 10);
        // create admin
        const admin = await User.create({
            firstName,
            lastName,
            email: decoded.email,
            password: hashedPassword,
            role: "admin",
            branchId: branch._id
        });

        res.status(201).json({
            message: "Admin registered successfully",
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                role: admin.role,
                branchId: admin.branchId
            },
            branch: {
                id: branch._id,
                branchName: branch.branchName,
                branchCode: branch.branchCode
            }
        });
    } catch (error) {
        console.error("Admin registration error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// client registration
export const registerClient = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        // validate password strength
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        // check if email already taken
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        // hash password and create client
        const hashedPassword = await bcrypt.hash(password, 10);
        const client = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: "client"
        });

        res.status(201).json({
            message: "Account created successfully",
            user: {
                id: client._id,
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                role: client.role
            }
        });
    } catch (error) {
        console.error("Client registration error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// client login
export const clientLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // find user and check if they're a client
        const user = await User.findOne({ email });
        if (!user || user.role !== "client") {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // set token in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            message: "Login successful",
            user: serializeAuthUser(user)
        });
    } catch (error) {
        console.error("Client login error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// admin login
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // find user and check if they're an admin
        const user = await User.findOne({ email });
        if (!user || user.role !== "admin") {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // generate JWT with branchId included
        const token = jwt.sign(
            { id: user._id, role: user.role, branchId: user.branchId },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // set token in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                branchId: user.branchId
            }
        });
    } catch (error) {
        console.error("Admin login error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// client profile
export const updateClientProfile = async (req, res) => {
    try {
        if (req.user.role !== "client") {
            return res.status(403).json({ message: "You do not have permission to access this" });
        }

        const firstName = String(req.body.firstName || "").trim();
        const lastName = String(req.body.lastName || "").trim();
        const phone = String(req.body.phone || "").trim();

        if (!firstName || !lastName) {
            return res.status(400).json({ message: "First and last name are required" });
        }

        if (phone && !/^\+?[0-9][0-9\s-]{8,18}$/.test(phone)) {
            return res.status(400).json({ message: "Enter a valid phone number" });
        }

        const user = await User.findById(req.user._id);
        user.firstName = firstName;
        user.lastName = lastName;
        user.phone = phone;
        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: serializeAuthUser(user)
        });
    } catch (error) {
        console.error("Update client profile error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const changeClientPassword = async (req, res) => {
    try {
        if (req.user.role !== "client") {
            return res.status(403).json({ message: "You do not have permission to access this" });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from your current password" });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Change client password error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// logout (clear cookie)
export const logout = async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    res.status(200).json({ message: "Logged out successfully" });
};

// get current authenticated user (session restore)
export const getMe = async (req, res) => {
    res.status(200).json({
        user: serializeAuthUser(req.user)
    });
};
