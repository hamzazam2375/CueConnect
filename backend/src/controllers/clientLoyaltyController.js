import Loyalty from "../models/loyalty.js";
import { MAX_REDEEM_RATE, POINTS_PER_GAME, POINT_VALUE } from "../services/loyalty.js";

const HISTORY_LIMIT = 50;

export const getClientLoyalty = async (req, res) => {
    try {
        const loyalty = await Loyalty.findOne({ user: req.user._id }).lean();
        const history = (loyalty?.history || [])
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, HISTORY_LIMIT)
            .map((entry) => ({
                id: String(entry._id),
                type: entry.type,
                points: entry.points,
                description: entry.description,
                date: entry.date
            }));

        res.status(200).json({
            points: loyalty?.points || 0,
            history,
            rules: { pointsPerGame: POINTS_PER_GAME, pointValue: POINT_VALUE, maxRedeemRate: MAX_REDEEM_RATE }
        });
    } catch (error) {
        console.error("Get client loyalty error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
