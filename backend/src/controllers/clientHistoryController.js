import Booking from "../models/booking.js";
import Game from "../models/game.js";
import Loyalty from "../models/loyalty.js";
import Payment from "../models/payment.js";
import TournamentReg from "../models/tournamentReg.js";

// each list is capped so a long-time customer's history stays quick to load
const LIST_LIMIT = 100;
const ACTIVITY_LIMIT = 60;

const formatBranchName = (branch) => {
    const name = branch?.branchName || "";
    return name.toUpperCase().startsWith("GOODSHOT") ? name.toUpperCase() : `GOODSHOT ${name}`.trim();
};

const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const formatClock = (minutes) => {
    const hour = Math.floor((minutes % 1440) / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const formatDay = (date) => date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

// payment status shown to the client: pending | paid | rejected | cancelled | refunded
const onlineStatus = {
    booking: { pending: "pending", approved: "paid", completed: "paid", rejected: "rejected", cancelled: "cancelled" },
    event: { registered: "pending", confirmed: "paid", rejected: "rejected", cancelled: "cancelled" }
};
const clubStatus = { pending: "pending", completed: "paid", refunded: "refunded" };

const serializeGame = (game) => ({
    id: String(game._id),
    branchName: formatBranchName(game.branchId),
    tableName: game.table?.name || "Table",
    tableType: game.table?.tableType || null,
    type: game.type,
    startTime: game.startTime,
    endTime: game.endTime,
    duration: game.duration,
    totalAmount: game.totalAmount,
    discountApplied: game.discountApplied,
    finalAmount: game.finalAmount,
    status: game.status
});

// payments the club recorded, plus the online payments the client sent with proof
const buildPayments = ({ payments, bookings, registrations }) => {
    // an online Payment record for a booking or event is the club's copy of a proof payment,
    // so the proof entry is skipped rather than counted twice
    const recordedOnline = new Set(payments.filter((payment) => payment.method === "online").map((payment) => String(payment.referenceId)));
    const online = (type, doc, amount, description) => (recordedOnline.has(String(doc._id)) ? null : {
        id: `${type}-${doc._id}`,
        type,
        description,
        amount,
        method: doc.paymentAccount?.method || "online",
        reference: doc.reference,
        transactionId: doc.transactionId,
        status: onlineStatus[type][doc.status] || "pending",
        date: doc.paymentSubmittedAt || doc.createdAt
    });

    return [
        ...payments.map((payment) => ({
            id: String(payment._id),
            type: payment.type,
            description: `${capitalize(payment.type)} payment at ${formatBranchName(payment.branchId).replace("GOODSHOT ", "")}`,
            amount: payment.amount,
            method: payment.method,
            reference: null,
            transactionId: null,
            status: clubStatus[payment.status] || "pending",
            date: payment.createdAt
        })),
        ...bookings.filter((booking) => booking.transactionId).map((booking) => online("booking", booking, booking.advanceAmount,
            `Booking advance · ${booking.table?.name || "Table"}, ${formatDay(booking.date)}`)),
        ...registrations.filter((registration) => registration.feePaid > 0 && registration.transactionId).map((registration) => online("event", registration, registration.feePaid,
            `Entry fee · ${registration.event?.title || "Event"}`))
    ]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const buildActivity = ({ bookings, games, registrations, loyalty }) => [
    ...bookings.map((booking) => ({
        id: `booking-${booking._id}`,
        kind: "booking",
        title: `Booked ${booking.table?.name || "a table"}`,
        detail: `${formatDay(booking.date)} · ${formatClock(booking.startTime)} · ${formatBranchName(booking.branchId).replace("GOODSHOT ", "")}`,
        status: booking.status,
        amount: booking.totalAmount,
        date: booking.createdAt,
        link: "/client/bookings"
    })),
    ...games.map((game) => ({
        id: `game-${game._id}`,
        kind: "game",
        title: `Played ${game.type === "century" ? "a century game" : "frames"} on ${game.table?.name || "a table"}`,
        detail: `${game.status === "active" ? "In progress" : `${game.duration} min`} · ${formatBranchName(game.branchId).replace("GOODSHOT ", "")}`,
        status: game.status,
        amount: game.status === "completed" ? game.finalAmount : null,
        date: game.endTime || game.startTime,
        link: null
    })),
    ...registrations.map((registration) => ({
        id: `event-${registration._id}`,
        kind: "event",
        title: `Registered for ${registration.event?.title || "an event"}`,
        detail: registration.event ? formatBranchName(registration.event.branchId).replace("GOODSHOT ", "") : "",
        status: registration.status,
        amount: registration.feePaid || null,
        date: registration.createdAt,
        link: "/client/events?tab=mine"
    })),
    ...(loyalty?.history || []).map((entry) => ({
        id: `loyalty-${entry._id}`,
        kind: "loyalty",
        title: `${entry.type === "earned" ? "Earned" : entry.type === "redeemed" ? "Used" : "Got back"} ${entry.points} loyalty ${entry.points === 1 ? "point" : "points"}`,
        detail: entry.description || "",
        status: entry.type,
        amount: null,
        date: entry.date,
        link: "/client/loyalty"
    }))
]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, ACTIVITY_LIMIT);

export const getClientHistory = async (req, res) => {
    try {
        const user = req.user._id;
        const branch = { path: "branchId", select: "branchName" };
        const [bookings, games, registrations, payments, loyalty, gameTotals] = await Promise.all([
            Booking.find({ user }).sort({ createdAt: -1 }).limit(LIST_LIMIT).populate(branch).populate("table", "name tableType").lean(),
            Game.find({ user }).sort({ startTime: -1 }).limit(LIST_LIMIT).populate(branch).populate("table", "name tableType").lean(),
            TournamentReg.find({ user }).sort({ createdAt: -1 }).limit(LIST_LIMIT).populate({ path: "event", select: "title branchId", populate: branch }).lean(),
            Payment.find({ user }).sort({ createdAt: -1 }).limit(LIST_LIMIT).populate(branch).lean(),
            Loyalty.findOne({ user }).lean(),
            // all-time totals, not just the listed games
            Game.aggregate([
                { $match: { user, status: "completed" } },
                { $group: { _id: null, count: { $sum: 1 }, minutes: { $sum: "$duration" } } }
            ])
        ]);

        const paymentList = buildPayments({ payments, bookings, registrations });

        res.status(200).json({
            summary: {
                memberSince: req.user.createdAt,
                gamesPlayed: gameTotals[0]?.count || 0,
                minutesPlayed: gameTotals[0]?.minutes || 0,
                totalPaid: paymentList.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0),
                bookings: bookings.length,
                completedBookings: bookings.filter((booking) => booking.status === "completed").length,
                eventsJoined: registrations.filter((registration) => registration.status === "confirmed").length,
                loyaltyPoints: loyalty?.points || 0
            },
            games: games.map(serializeGame),
            payments: paymentList,
            activity: buildActivity({ bookings, games, registrations, loyalty })
        });
    } catch (error) {
        console.error("Get client history error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
