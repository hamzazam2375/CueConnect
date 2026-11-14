// formatting helpers shared by the admin pages

export const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

export const formatDate = (value) => value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

export const formatDateTime = (value) => value
    ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

// bookings and waitlist entries store their calendar day as midnight UTC, so read it back in UTC
export const formatBookingDay = (value) => value
    ? new Date(value).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "—";

export const bookingDateKey = (value) => new Date(value).toISOString().slice(0, 10);

// minutes after midnight → "2:00 PM"; values past 1440 are after midnight
export const formatClock = (minutes) => {
    const total = ((Number(minutes) % 1440) + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const mins = total % 60;
    return `${hour % 12 || 12}:${String(mins).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

// today's date in the admin's own timezone as YYYY-MM-DD (toISOString would give the UTC date)
export const localDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// a Date → value for <input type="datetime-local"> in local time
export const toLocalInputValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const apiError = (error, fallback) => error?.response?.data?.message || fallback;

// saves a blob response (PDF etc.) as a file
export const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // revoking straight away can cancel the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const EXPENSE_CATEGORIES = [
    { value: "rent", label: "Rent" },
    { value: "utilities", label: "Utilities" },
    { value: "equipment", label: "Equipment" },
    { value: "salary", label: "Salary" },
    { value: "maintenance", label: "Maintenance" },
    { value: "other", label: "Other" }
];
