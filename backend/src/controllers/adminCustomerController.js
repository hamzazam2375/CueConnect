import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.js";
import Game from "../models/game.js";
import Booking from "../models/booking.js";
import Bill from "../models/bill.js";
import Loyalty from "../models/loyalty.js";
import { allocateCustomerCode, displayCustomerCode } from "../utils/customerCode.js";
import { passwordError } from "../utils/passwordPolicy.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^\+?[0-9][0-9\s-]{8,18}$/;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeListCustomer = (user, loyaltyPoints = 0) => ({
    id: String(user._id),
    customerId: displayCustomerCode(user),
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone || "",
    isActive: user.isActive !== false,
    loyaltyPoints: Number(loyaltyPoints || 0),
    registered: true,
    createdAt: user.createdAt
});

const findClient = (id) => User.findOne({ _id: id, role: "client" });

export const listCustomers = async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const page = Number(req.query.page);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const paginate = Number.isInteger(page) && page > 0;

        const filter = { role: "client" };
        if (search) {
            const rx = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { firstName: rx },
                { lastName: rx },
                { email: rx },
                { customerCode: rx },
                { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: escapeRegex(search), options: "i" } } }
            ];
        }

        const query = User.find(filter)
            .select("firstName lastName email phone customerCode isActive createdAt")
            .sort({ firstName: 1, lastName: 1 });

        const [total, customers] = await Promise.all([
            paginate ? User.countDocuments(filter) : Promise.resolve(null),
            paginate ? query.skip((page - 1) * limit).limit(limit).lean() : query.lean()
        ]);

        const loyalties = await Loyalty.find({ user: { $in: customers.map((customer) => customer._id) } })
            .select("user points")
            .lean();
        const pointsByUser = new Map(loyalties.map((item) => [String(item.user), item.points]));

        res.status(200).json({
            customers: customers.map((customer) => serializeListCustomer(customer, pointsByUser.get(String(customer._id)))),
            ...(paginate ? { total, page, pages: Math.max(1, Math.ceil(total / limit)), limit } : {})
        });
    } catch (error) {
        console.error("List customers error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCustomer = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid customer" });
        }

        const customer = await findClient(req.params.id).lean();
        if (!customer) {
            return res.status(404).json({ message: "Registered customer not found" });
        }

        const branchId = req.user.branchId;
        const userId = customer._id;

        const [gamesAsPlayer, gamesAsPayer, bookingsMade, loyalty, bills] = await Promise.all([
            Game.countDocuments({ branchId, user: userId }),
            Game.countDocuments({ branchId, payerUser: userId }),
            Booking.countDocuments({ branchId, user: userId }),
            Loyalty.findOne({ user: userId }).select("points").lean(),
            Bill.find({ branchId, payerUser: userId }).select("status paidAmount remainingBalance").lean()
        ]);

        const billing = bills.reduce((summary, bill) => {
            summary.totalPaid += Number(bill.paidAmount || 0);
            if (bill.status === "pending") summary.pendingAmount += Number(bill.remainingBalance || 0);
            if (bill.status === "partial") summary.partialAmount += Number(bill.remainingBalance || 0);
            return summary;
        }, { totalPaid: 0, pendingAmount: 0, partialAmount: 0 });

        res.status(200).json({
            customer: {
                ...serializeListCustomer(customer, loyalty?.points || 0),
                gamesAsPlayer,
                gamesAsPayer,
                bookingsMade,
                bookingsAsPayer: bookingsMade,
                billing
            }
        });
    } catch (error) {
        console.error("Get customer error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const createCustomer = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const phone = String(req.body.phone || "").trim();
        if (!String(firstName || "").trim() || !String(lastName || "").trim() || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }
        if (!emailRegex.test(String(email).trim())) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Enter a valid phone number" });
        }
        // same rules a client meets when signing up themselves
        const weakPassword = passwordError(password);
        if (weakPassword) {
            return res.status(400).json({ message: weakPassword });
        }

        const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const customer = await User.create({
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            email: String(email).toLowerCase().trim(),
            phone: phone || undefined,
            password: await bcrypt.hash(password, 10),
            role: "client",
            customerCode: await allocateCustomerCode(),
            isActive: true
        });

        res.status(201).json({
            message: "Customer registered",
            customer: serializeListCustomer(customer, 0)
        });
    } catch (error) {
        console.error("Create customer error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateCustomer = async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid customer" });
        }

        const customer = await findClient(req.params.id);
        if (!customer) {
            return res.status(404).json({ message: "Registered customer not found" });
        }

        const { firstName, lastName, email, phone, isActive } = req.body;
        if (firstName != null) {
            if (!String(firstName).trim()) return res.status(400).json({ message: "First name is required" });
            customer.firstName = String(firstName).trim();
        }
        if (lastName != null) {
            if (!String(lastName).trim()) return res.status(400).json({ message: "Last name is required" });
            customer.lastName = String(lastName).trim();
        }
        if (email != null) {
            const nextEmail = String(email).toLowerCase().trim();
            if (!emailRegex.test(nextEmail)) {
                return res.status(400).json({ message: "Please enter a valid email address" });
            }
            const taken = await User.findOne({ email: nextEmail, _id: { $ne: customer._id } });
            if (taken) {
                return res.status(409).json({ message: "An account with this email already exists" });
            }
            customer.email = nextEmail;
        }
        if (phone != null) {
            const nextPhone = String(phone).trim();
            if (nextPhone && !phoneRegex.test(nextPhone)) {
                return res.status(400).json({ message: "Enter a valid phone number" });
            }
            customer.phone = nextPhone;
        }
        if (isActive != null) {
            customer.isActive = Boolean(isActive);
        }

        await customer.save();
        const loyalty = await Loyalty.findOne({ user: customer._id }).select("points").lean();

        res.status(200).json({
            message: "Customer updated",
            customer: serializeListCustomer(customer, loyalty?.points || 0)
        });
    } catch (error) {
        console.error("Update customer error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
