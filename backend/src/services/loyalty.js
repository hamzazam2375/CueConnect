import Loyalty from "../models/loyalty.js";
import { notifyUser } from "./notifications.js";

// 10 points for every completed game the client plays. Payment-based points are earned at 1 point
// per PKR 10 spent. Keep in sync with frontend/src/utils/loyalty.js.
export const PKR_PER_POINT_EARNED = 10;
export const POINTS_PER_GAME = 10;
export const POINT_VALUE = 1;
export const REWARD_THRESHOLD = 200;
export const MAX_REDEEM_RATE = 0.2;

export const pointsForPayment = (amount) => Math.floor(Math.max(amount, 0) / PKR_PER_POINT_EARNED);
export const maxRedeemablePoints = (total) => Math.floor(Math.max(total, 0) * MAX_REDEEM_RATE / POINT_VALUE);

const historyEntry = (type, points, description, paymentId = null) => ({ type, points, description, paymentId, date: new Date() });

export const getPointsBalance = async (userId) => (await Loyalty.findOne({ user: userId?._id || userId }).select("points"))?.points || 0;

// Call when a client's payment is recorded (e.g. a game bill or a completed booking).
// Adds the points, logs them, and notifies the client; returns the points added.
export const awardPoints = async ({ user, branchId, points: explicitPoints, amount, description, paymentId = null }) => {
    if (!user) return 0;
    const userId = user._id || user;
    const points = explicitPoints > 0 ? Math.floor(explicitPoints) : pointsForPayment(amount);
    if (!points) return 0;

    try {
        const filter = paymentId
            ? { user: userId, "history.paymentId": { $ne: paymentId } }
            : { user: userId };
        const loyalty = await Loyalty.findOneAndUpdate(
            filter,
            {
                $inc: { points },
                $push: { history: historyEntry("earned", points, description, paymentId) },
                $setOnInsert: { branchId }
            },
            { upsert: true }
        );
        if (!loyalty && paymentId) {
            const existing = await Loyalty.findOne({ user: userId, "history.paymentId": paymentId }).select("_id");
            if (existing) return 0;
        }
    } catch (error) {
        if (error.code === 11000 && paymentId) return 0;
        throw error;
    }

    await notifyUser({
        user: userId,
        branchId,
        type: "loyalty",
        title: `You earned ${points} loyalty ${points === 1 ? "point" : "points"}`,
        message: `${description}. Once you have more than ${REWARD_THRESHOLD} points, the club can apply them as a discount on your bill.`,
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
    const userId = user?._id || user;
    const result = await Loyalty.updateOne(
        { user: userId, points: { $gte: points } },
        { $inc: { points: -points }, $push: { history: historyEntry("redeemed", points, description) } }
    );
    return result.modifiedCount === 1;
};

// gives redeemed points back, e.g. when the booking they paid for is cancelled or rejected
export const restorePoints = async ({ user, points, description }) => {
    if (!points) return;
    const userId = user?._id || user;
    await Loyalty.updateOne(
        { user: userId },
        { $inc: { points }, $push: { history: historyEntry("refunded", points, description) } }
    );
};
