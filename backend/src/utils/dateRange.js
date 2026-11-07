const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value) => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

export const rangeBounds = (range = "month", from, to) => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    if (range === "today") return { start, end };
    if (range === "week") {
        const weekday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - weekday);
        return { start, end };
    }
    if (range === "month") {
        start.setDate(1);
        return { start, end };
    }
    if (range === "year") {
        start.setMonth(0, 1);
        return { start, end };
    }

    if (from) start = startOfDay(from);
    if (to) end = endOfDay(to);
    if (start > end) {
        const swap = start;
        start = startOfDay(end);
        end = endOfDay(swap);
    }
    return { start, end };
};

export const monthBounds = (yearMonth) => {
    const [year, month] = String(yearMonth || "").split("-").map(Number);
    const now = new Date();
    const y = year || now.getFullYear();
    const m = (month || now.getMonth() + 1) - 1;
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

export const formatDayKey = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const formatMonthKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
