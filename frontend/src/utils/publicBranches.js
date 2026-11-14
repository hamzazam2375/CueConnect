import api from "../services/api";

// branches with their tables and prices for the website; no login needed
export const fetchPublicBranches = async () => {
    const { data } = await api.get("/branches");
    return data.branches || [];
};

// minutes after midnight → "2:00 AM"; hours past 1440 roll into the next morning
const formatHour = (minutes) => {
    const total = ((Number(minutes) % 1440) + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const mins = total % 60;
    return `${hour % 12 || 12}:${String(mins).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

export const formatOpeningHours = (branch) => `${formatHour(branch.openingTime)} – ${formatHour(branch.closingTime)} (Daily)`;

// "GOODSHOT IQBAL TOWN" → "IQBAL TOWN" where the brand is already obvious
export const shortBranchName = (name = "") => name.replace(/^GOODSHOT\s+/i, "");
