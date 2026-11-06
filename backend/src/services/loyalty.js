import Loyalty from "../models/loyalty.js";
import { notifyUser } from "./notifications.js";

// 1 point per PKR 100 paid; each point is worth PKR 1 off a booking, up to 20% of its total.
// Keep in sync with frontend/src/utils/loyalty.js.
export const PKR_PER_POINT_EARNED = 100;
export const POINT_VALUE = 1;
export const MAX_REDEEM_RATE = 0.2;

export const pointsForPayment = (amount) => Math.floor(Math.max(amount, 0) / PKR_PER_POINT_EARNED);

export const maxRedeemablePoints = (total) => Math.floor(Math.max(total, 0) * MAX_REDEEM_RATE / POINT_VALUE);

const historyEntry = (type, points, description) => ({ type, points, description, date: new Date() });

export const getPointsBalance = async (userId) => (await Loyalty.findOne({ user: userId }).select("points"))?.points || 0;

// Call when a client's payment is recorded (e.g. a game bill or a completed booking).
// Adds the points, logs them, and notifies the client; returns the points added.
export const awardPoints = async ({ user, branchId, amount, description }) => {
    const points = pointsForPayment(amount);
    if (!points) return 0;

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
