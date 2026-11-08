import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import Table from "../models/table.js";
import Booking from "../models/booking.js";
import Game from "../models/game.js";
import Income from "../models/income.js";
import Expense from "../models/expense.js";
import Event from "../models/event.js";
import Waitlist from "../models/waitlist.js";
import {
    listActiveGames,
    listGameHistory,
    getGame,
    startGame,
    stopGame
} from "../controllers/adminGameController.js";
import {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer
} from "../controllers/adminCustomerController.js";
import {
    listBills,
    getBill,
    applyBillDiscount,
    recordBillPayment,
    downloadBillReceipt,
    redeemBillReward
} from "../controllers/adminBillingController.js";
import Bill from "../models/bill.js";
import {
    getFinanceOverview,
    listFinanceIncome,
    listFinanceExpenses,
    createExpense,
    previewFinanceReport,
    downloadFinanceReport
} from "../controllers/adminFinanceController.js";
import {
    getSettings,
    updateBranchSettings,
    addPaymentAccount,
    updatePaymentAccount,
    deletePaymentAccount,
    updateAdminProfile,
    updateAdminPassword
} from "../controllers/adminSettingsController.js";
import {
    listAdminBookings,
    updateAdminBooking,
    getAdminBookingProof,
    listAdminEvents,
    createAdminEvent,
    updateAdminEvent,
    updateAdminEventStatus,
    listAdminEventRegistrations,
    updateAdminEventRegistration,
    getAdminEventRegistrationProof,
    listAdminWaitlist,
    notifyWaitlistCustomer
} from "../controllers/adminBookingEventController.js";
import {
    getSocketToken,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from "../controllers/clientNotificationController.js";

const router = express.Router();

router.get("/customers", protect, authorize("admin"), listCustomers);
router.post("/customers", protect, authorize("admin"), createCustomer);
router.get("/customers/:id", protect, authorize("admin"), getCustomer);
router.patch("/customers/:id", protect, authorize("admin"), updateCustomer);
router.get("/games/active", protect, authorize("admin"), listActiveGames);
router.get("/games/history", protect, authorize("admin"), listGameHistory);
router.post("/games", protect, authorize("admin"), startGame);
router.get("/games/:id", protect, authorize("admin"), getGame);
router.patch("/games/:id/stop", protect, authorize("admin"), stopGame);

router.get("/bookings", protect, authorize("admin"), listAdminBookings);
router.patch("/bookings/:id", protect, authorize("admin"), updateAdminBooking);
router.get("/bookings/:id/payment-proof", protect, authorize("admin"), getAdminBookingProof);
router.get("/waitlist", protect, authorize("admin"), listAdminWaitlist);
router.patch("/waitlist/:id/notify", protect, authorize("admin"), notifyWaitlistCustomer);
router.get("/socket-token", protect, authorize("admin"), getSocketToken);
router.get("/notifications", protect, authorize("admin"), listNotifications);
router.patch("/notifications/:id/read", protect, authorize("admin"), markNotificationRead);
router.patch("/notifications/read-all", protect, authorize("admin"), markAllNotificationsRead);
router.get("/events", protect, authorize("admin"), listAdminEvents);
router.post("/events", protect, authorize("admin"), createAdminEvent);
router.patch("/events/:id", protect, authorize("admin"), updateAdminEvent);
router.patch("/events/:id/status", protect, authorize("admin"), updateAdminEventStatus);
router.get("/events/:id/registrations", protect, authorize("admin"), listAdminEventRegistrations);
router.patch("/event-registrations/:id", protect, authorize("admin"), updateAdminEventRegistration);
router.get("/event-registrations/:id/payment-proof", protect, authorize("admin"), getAdminEventRegistrationProof);

router.get("/bills", protect, authorize("admin"), listBills);
router.get("/bills/:id/receipt", protect, authorize("admin"), downloadBillReceipt);
router.get("/bills/:id", protect, authorize("admin"), getBill);
router.patch("/bills/:id/discount", protect, authorize("admin"), applyBillDiscount);
router.post("/bills/:id/payments", protect, authorize("admin"), recordBillPayment);
router.post("/bills/:id/loyalty-reward", protect, authorize("admin"), redeemBillReward);

router.get("/finance", protect, authorize("admin"), getFinanceOverview);
router.get("/finance/income", protect, authorize("admin"), listFinanceIncome);
router.get("/finance/expenses", protect, authorize("admin"), listFinanceExpenses);
router.get("/finance/report", protect, authorize("admin"), previewFinanceReport);
router.get("/finance/report-pdf", protect, authorize("admin"), downloadFinanceReport);
router.post("/expenses", protect, authorize("admin"), createExpense);

router.get("/settings", protect, authorize("admin"), getSettings);
router.patch("/settings/branch", protect, authorize("admin"), updateBranchSettings);
router.post("/settings/accounts", protect, authorize("admin"), addPaymentAccount);
router.patch("/settings/accounts/:accountId", protect, authorize("admin"), updatePaymentAccount);
router.delete("/settings/accounts/:accountId", protect, authorize("admin"), deletePaymentAccount);
router.patch("/settings/profile", protect, authorize("admin"), updateAdminProfile);
router.patch("/settings/password", protect, authorize("admin"), updateAdminPassword);

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", protect, authorize("admin"), async (req, res) => {
    try {
        const branchId = req.user.branchId;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // tables
        const totalTables = await Table.countDocuments({ branchId });
        const availableTables = await Table.countDocuments({ branchId, status: "available" });
        const occupiedTables = await Table.countDocuments({ branchId, status: "occupied" });

        // bookings
        const pendingBookings = await Booking.countDocuments({ branchId, status: "pending" });
        const todayBookings = await Booking.countDocuments({
            branchId,
            date: { $gte: todayStart, $lte: todayEnd }
        });

        // active games
        const activeGames = await Game.countDocuments({ branchId, status: "active" });

        // today's income
        const todayIncomeResult = await Income.aggregate([
            { $match: { branchId, date: { $gte: todayStart, $lte: todayEnd }, category: { $ne: "booking" }, sourceType: { $nin: ["booking"] }, status: { $ne: "refunded" } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todayIncome = todayIncomeResult[0]?.total || 0;

        // today's expenses
        const todayExpenseResult = await Expense.aggregate([
            { $match: { branchId, date: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todayExpenses = todayExpenseResult[0]?.total || 0;

        const unpaidBills = await Bill.countDocuments({ branchId, status: { $in: ["pending", "partial"] } });

        // waitlist count (people currently waiting)
        const waitlistCount = await Waitlist.countDocuments({ branchId, status: "waiting" });

        // upcoming events & tournaments
        const upcomingEvents = await Event.countDocuments({
            branchId,
            date: { $gte: todayStart }
        });
        const upcomingTournaments = await Event.countDocuments({
            branchId,
            date: { $gte: todayStart },
            type: "tournament"
        });

        // recent activity (last 10 actions across bookings, games, income)
        const [recentBookings, recentGames, recentIncomes] = await Promise.all([
            Booking.find({ branchId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("user", "firstName lastName")
                .populate("table", "name")
                .lean(),
            Game.find({ branchId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("table", "name")
                .lean(),
            Income.find({ branchId })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        const recentActivity = [
            ...recentBookings.map((b) => ({
                type: "booking",
                message: `${b.user?.firstName || "Someone"} ${b.user?.lastName || ""} booked ${b.table?.name || "a table"}`.trim(),
                status: b.status,
                time: b.createdAt
            })),
            ...recentGames.map((g) => ({
                type: "game",
                message: `${g.type === "century" ? "Century" : "Frame"} game on ${g.table?.name || "a table"}`,
                status: g.status,
                time: g.createdAt
            })),
            ...recentIncomes.map((i) => ({
                type: "income",
                message: `Rs. ${i.amount.toLocaleString()} — ${i.source}`,
                status: "completed",
                time: i.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 8);

        res.status(200).json({
            totalTables,
            availableTables,
            occupiedTables,
            pendingBookings,
            todayBookings,
            activeGames,
            todayIncome,
            todayExpenses,
            unpaidBills,
            waitlistCount,
            upcomingEvents,
            upcomingTournaments,
            recentActivity
        });
    } catch (error) {
        console.error("Dashboard stats error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

// ── TABLE MANAGEMENT ──

// GET /api/admin/tables — list all tables for admin's branch
router.get("/tables", protect, authorize("admin"), async (req, res) => {
    try {
        const tables = await Table.find({ branchId: req.user.branchId }).sort({ name: 1 });
        res.status(200).json({ tables });
    } catch (error) {
        console.error("Fetch tables error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/admin/tables — create a new table
router.post("/tables", protect, authorize("admin"), async (req, res) => {
    try {
        const { name, tableType, status, pricePerHour, frameRate, centuryRate } = req.body;

        const perMinute = Number(centuryRate);
        const hourly = pricePerHour == null || pricePerHour === "" ? perMinute * 60 : Number(pricePerHour);

        if (!name || !tableType || frameRate == null || centuryRate == null || Number.isNaN(perMinute) || Number.isNaN(hourly)) {
            return res.status(400).json({ message: "Name, type, frame rate, and century rate are required" });
        }

        if (!["snooker", "billiard"].includes(tableType)) {
            return res.status(400).json({ message: "Table type must be 'snooker' or 'billiard'" });
        }

        // check duplicate name within the branch
        const existing = await Table.findOne({ branchId: req.user.branchId, name });
        if (existing) {
            return res.status(409).json({ message: `A table named "${name}" already exists in your branch` });
        }

        const table = await Table.create({
            branchId: req.user.branchId,
            name,
            tableType,
            status: status || "available",
            pricePerHour: hourly,
            frameRate,
            centuryRate: perMinute
        });

        res.status(201).json({ message: "Table created successfully", table });
    } catch (error) {
        console.error("Create table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/admin/tables/:id — update a table
router.put("/tables/:id", protect, authorize("admin"), async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }
        if (table.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({ message: "You do not have access to this table" });
        }

        const { name, tableType, status, pricePerHour, frameRate, centuryRate } = req.body;

        // check duplicate name if name is changing
        if (name && name !== table.name) {
            const duplicate = await Table.findOne({ branchId: req.user.branchId, name });
            if (duplicate) {
                return res.status(409).json({ message: `A table named "${name}" already exists in your branch` });
            }
        }

        if (name) table.name = name;
        if (tableType) table.tableType = tableType;
        if (status) table.status = status;
        if (pricePerHour != null) table.pricePerHour = pricePerHour;
        if (frameRate != null) table.frameRate = frameRate;
        if (centuryRate != null) table.centuryRate = centuryRate;

        await table.save();
        res.status(200).json({ message: "Table updated successfully", table });
    } catch (error) {
        console.error("Update table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/admin/tables/:id — delete a table
router.delete("/tables/:id", protect, authorize("admin"), async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }
        if (table.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({ message: "You do not have access to this table" });
        }

        await table.deleteOne();
        res.status(200).json({ message: "Table deleted successfully" });
    } catch (error) {
        console.error("Delete table error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
