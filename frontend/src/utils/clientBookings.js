import api from "../services/api";
import { fetchProofUrl, postWithProof } from "./payments";

// keep in sync with MAX_BOOKING_DAYS in backend/src/controllers/clientBookingController.js
export const MAX_BOOKING_DAYS = 30;

export const getApiError = (error, fallback) => error.response?.data?.message || fallback;

export const fetchBookingBranches = async () => {
    const { data } = await api.get("/client/branches");
    return data.branches;
};

// resolves to { branch, tables }
export const fetchBranchTables = async (branchId) => {
    const { data } = await api.get(`/client/branches/${encodeURIComponent(branchId)}/tables`);
    return data;
};

// booked time ranges for every table in the branch on that date
export const fetchBranchAvailability = async (branchId, date, excludeReference) => {
    const { data } = await api.get(`/client/branches/${encodeURIComponent(branchId)}/availability`, {
        params: { date, exclude: excludeReference }
    });
    return data.busy;
};

export const fetchClientBookings = async () => {
    const { data } = await api.get("/client/bookings");
    return data.bookings;
};

export const fetchClientBooking = async (reference) => {
    const { data } = await api.get(`/client/bookings/${encodeURIComponent(reference)}`);
    return data.booking;
};

// keep in sync with ADVANCE_RATE in backend/src/controllers/clientBookingController.js
export const ADVANCE_RATE = 0.5;
export const getAdvanceAmount = (total) => Math.ceil(total * ADVANCE_RATE);

// price before any loyalty points; mirrors the backend
export const getBookingTotal = (hourlyRate, duration) => hourlyRate * duration;

export const createClientBooking = async ({ tableId, date, startTime, duration, paymentAccountId, transactionId, paymentProof, loyaltyPoints = 0 }) => {
    const data = await postWithProof("/client/bookings", { tableId, date, startTime, duration, paymentAccountId, transactionId, loyaltyPoints }, paymentProof);
    return data.booking;
};

export const fetchBookingProofUrl = (reference) => fetchProofUrl(`/client/bookings/${encodeURIComponent(reference)}/payment-proof`);

export const cancelClientBooking = async (reference, reason = "") => {
    const { data } = await api.patch(`/client/bookings/${encodeURIComponent(reference)}/cancel`, { reason });
    return data.booking;
};

export const rescheduleClientBooking = async (reference, { date, startTime, duration }) => {
    const { data } = await api.patch(`/client/bookings/${encodeURIComponent(reference)}/reschedule`, { date, startTime, duration });
    return data.booking;
};

export const changeClientBookingTable = async (reference, tableId) => {
    const { data } = await api.patch(`/client/bookings/${encodeURIComponent(reference)}/table`, { tableId });
    return data.booking;
};

export const getSlotTimes = (branch) => Array.from(
    { length: (branch.closingTime - branch.openingTime) / 60 },
    (_, index) => branch.openingTime + index * 60
);

export const isTableFree = (busy, tableId, startTime, endTime) => !busy.some(
    (slot) => slot.tableId === tableId && slot.startTime < endTime && slot.endTime > startTime
);

// true when a slot on `dateKey` (local YYYY-MM-DD) has already started
export const hasSlotStarted = (dateKey, startTime) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day, 0, startTime) <= new Date();
};

export const formatOpeningHours = (branch) => {
    const format = (minutes) => {
        const hour = Math.floor((minutes % 1440) / 60);
        return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
    };
    return `${format(branch.openingTime)} – ${format(branch.closingTime)}`;
};

export const fetchClientWaitlist = async () => {
    const { data } = await api.get("/client/waitlist");
    return data.waitlist;
};

export const joinWaitlist = async ({ tableId, date, startTime, duration }) => {
    const { data } = await api.post("/client/waitlist", { tableId, date, startTime, duration });
    return data.entry;
};

export const leaveWaitlist = async (id) => {
    const { data } = await api.patch(`/client/waitlist/${encodeURIComponent(id)}/cancel`);
    return data.entry;
};
