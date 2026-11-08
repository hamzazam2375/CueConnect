import api from "../services/api";

// Keep in sync with backend/src/services/loyalty.js.
export const PKR_PER_POINT_EARNED = 10;
export const POINT_VALUE = 1;
export const REWARD_THRESHOLD = 200;
export const MAX_REDEEM_RATE = 0.2;

// most points the club accepts on a booking of this total
export const maxRedeemablePoints = (total) => Math.floor(Math.max(total, 0) * MAX_REDEEM_RATE / POINT_VALUE);

// resolves to { points, history, rules }
export const fetchClientLoyalty = async () => {
    const { data } = await api.get("/client/loyalty");
    return data;
};
