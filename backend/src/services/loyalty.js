import Loyalty from "../models/loyalty.js";
import { notifyUser } from "./notifications.js";

// 10 points for every completed game the client plays; each point is worth PKR 1 off a booking,
// up to 20% of its total. Keep in sync with frontend/src/utils/loyalty.js.
export const POINTS_PER_GAME = 10;
export const POINT_VALUE = 1;
export const MAX_REDEEM_RATE = 0.2;

export const maxRedeemablePoints = (total) => Math.floor(Math.max(total, 0) * MAX_REDEEM_RATE / POINT_VALUE);

const historyEntry = (type, points, description) => ({ type, points, description, date: new Date() });

export const getPointsBalance = async (userId) => (await Loyalty.findOne({ user: userId }).select("points"))?.points || 0;

// Adds `points` to the client's balance, logs them, and notifies the client; returns the points added.
export const awardPoints = async ({ user, branchId, points, description }) => {
    if (!user || !(points > 0)) return 0;

    await Loyalty.findOneAndUpdate(
        { user },
        {
            $inc: { points },
            $push: { history: historyEntry("earned", points, description) },
            $setOnInsert: { branchId }
        },
        { upsert: true }
    );

    await notifyUser({
        user,
        branchId,
        type: "loyalty",
        title: `You earned ${points} loyalty ${points === 1 ? "point" : "points"}`,
        message: `${description}. Use your points for a discount on your next booking.`,
        link: "/client/loyalty"
    });
    return points;
};

// Call once when a game is completed. Only registered players earn points; never throws,
// so a failure here can't undo the game itself.
export const awardGamePoints = async (game, tableName) => {
    if (!game.user || game.status !== "completed") return 0;
    try {
        const kind = game.type === "century" ? "Century game" : "Frame";
        return await awardPoints({
            user: game.user,
            branchId: game.branchId,
            points: POINTS_PER_GAME,
            description: `${kind} on ${tableName || "a table"}`
        });
    } catch (error) {
        console.error("Award game points error:", error.message);
        return 0;
    }
};

// takes points off atomically; resolves to false if the balance is too low
export const redeemPoints = async ({ user, points, description }) => {
    const result = await Loyalty.updateOne(
        { user, points: { $gte: points } },
        { $inc: { points: -points }, $push: { history: historyEntry("redeemed", points, description) } }
    );
    return result.modifiedCount === 1;
};

// gives redeemed points back, e.g. when the booking they paid for is cancelled or rejected
export const restorePoints = async ({ user, points, description }) => {
    if (!points) return;
    await Loyalty.updateOne(
        { user },
        { $inc: { points }, $push: { history: historyEntry("refunded", points, description) } }
    );
};
