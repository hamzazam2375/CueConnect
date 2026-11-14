import Table from "../models/table.js";
import Booking from "../models/booking.js";
import Game from "../models/game.js";
import Income from "../models/income.js";
import Expense from "../models/expense.js";
import Event from "../models/event.js";
import Waitlist from "../models/waitlist.js";
import Bill from "../models/bill.js";
import TournamentReg from "../models/tournamentReg.js";
import { rangeBounds } from "../utils/dateRange.js";
import { collectedIncomeMatch } from "../utils/recordIncome.js";

const sum = async (Model, match) => {
    const [row] = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    return row?.total || 0;
};

// bookings store their calendar day as midnight UTC, so look up the local calendar day in that form
const todayBookingDate = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

const recentActivity = async (branchId) => {
    const [bookings, games, incomes] = await Promise.all([
        Booking.find({ branchId }).sort({ createdAt: -1 }).limit(5).populate("user", "firstName lastName").populate("table", "name").lean(),
        Game.find({ branchId }).sort({ createdAt: -1 }).limit(5).populate("table", "name").lean(),
        Income.find({ branchId }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    return [
        ...bookings.map((booking) => ({
            type: "booking",
            message: `${`${booking.user?.firstName || "Someone"} ${booking.user?.lastName || ""}`.trim()} booked ${booking.table?.name || "a table"}`,
            status: booking.status,
            time: booking.createdAt
        })),
        ...games.map((game) => ({
            type: "game",
            message: `${game.type === "century" ? "Century" : "Frame"} game on ${game.table?.name || "a table"} · ${game.playerName}`,
            status: game.status,
            time: game.createdAt
        })),
        ...incomes.map((income) => ({
            type: "income",
            message: `Rs. ${Number(income.amount || 0).toLocaleString()} · ${income.description || income.source}`,
            status: income.status === "refunded" ? "refunded" : "completed",
            time: income.createdAt
        }))
    ]
        .sort((first, second) => new Date(second.time) - new Date(first.time))
        .slice(0, 8);
};

export const getDashboardStats = async (req, res) => {
    try {
        const branchId = req.user.branchId;
        const { start, end } = rangeBounds("today");
        const upcomingEvent = { branchId, date: { $gte: start }, status: { $in: ["upcoming", "ongoing"] }, archived: { $ne: true } };

        const [
            totalTables,
            availableTables,
            occupiedTables,
            maintenanceTables,
            pendingBookings,
            todayBookings,
            activeGames,
            todayIncome,
            todayExpenses,
            unpaidBills,
            waitlistCount,
            upcomingEvents,
            upcomingTournaments,
            pendingRegistrations,
            activity
        ] = await Promise.all([
            Table.countDocuments({ branchId }),
            Table.countDocuments({ branchId, status: "available" }),
            Table.countDocuments({ branchId, status: "occupied" }),
            Table.countDocuments({ branchId, status: "maintenance" }),
            Booking.countDocuments({ branchId, status: "pending" }),
            Booking.countDocuments({ branchId, date: todayBookingDate(), status: { $in: ["pending", "approved", "completed"] } }),
            Game.countDocuments({ branchId, status: "active" }),
            sum(Income, collectedIncomeMatch(branchId, start, end)),
            sum(Expense, { branchId, date: { $gte: start, $lte: end } }),
            Bill.countDocuments({ branchId, status: { $in: ["pending", "partial"] } }),
            Waitlist.countDocuments({ branchId, status: "waiting" }),
            Event.countDocuments(upcomingEvent),
            Event.countDocuments({ ...upcomingEvent, type: "tournament" }),
            // event registrations whose payment proof is waiting for the club to verify it
            TournamentReg.countDocuments({ branchId, status: "registered" }),
            recentActivity(branchId)
        ]);

        res.status(200).json({
            totalTables,
            availableTables,
            occupiedTables,
            maintenanceTables,
            pendingBookings,
            todayBookings,
            activeGames,
            todayIncome,
            todayExpenses,
            unpaidBills,
            waitlistCount,
            upcomingEvents,
            upcomingTournaments,
            pendingRegistrations,
            recentActivity: activity
        });
    } catch (error) {
        console.error("Dashboard stats error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
