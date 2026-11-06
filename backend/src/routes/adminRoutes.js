import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import Table from "../models/table.js";
import Booking from "../models/booking.js";
import Game from "../models/game.js";
import Income from "../models/income.js";
import Expense from "../models/expense.js";
import Payment from "../models/payment.js";
import Event from "../models/event.js";
import Waitlist from "../models/waitlist.js";

const router = express.Router();

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
            { $match: { branchId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todayIncome = todayIncomeResult[0]?.total || 0;

        // today's expenses
        const todayExpenseResult = await Expense.aggregate([
            { $match: { branchId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todayExpenses = todayExpenseResult[0]?.total || 0;

        // unpaid bills
        const unpaidBills = await Payment.countDocuments({ branchId, status: "pending" });

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

        if (!name || !tableType || pricePerHour == null || frameRate == null || centuryRate == null) {
            return res.status(400).json({ message: "Name, type, price per hour, frame rate, and century rate are required" });
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
            pricePerHour,
            frameRate,
            centuryRate
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
