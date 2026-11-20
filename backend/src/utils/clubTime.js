// Booking times are club wall-clock times: a booking stores its calendar day as midnight UTC
// (a plain "YYYY-MM-DD" label) plus minutes after midnight, e.g. 18 * 60 for 6:00 PM, and
// 1440+ for after midnight. The server itself runs on UTC, so anything that compares a slot
// with "now" or asks for "today" has to do it in the club's time zone.

export const clubTimeZone = () => process.env.CLUB_TIME_ZONE || "Asia/Karachi";

const partsIn = (timeZone, instant) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).formatToParts(instant);
    const value = (type) => Number(parts.find((part) => part.type === type).value);
    return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
};

// how far the club's clock is ahead of UTC at `instant`, in milliseconds (+5h for Pakistan)
const offsetAt = (instant, timeZone = clubTimeZone()) => {
    const p = partsIn(timeZone, instant);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

// today's date at the club, as "YYYY-MM-DD"
export const clubTodayKey = (now = new Date()) => {
    const p = partsIn(clubTimeZone(), now);
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

// today at the club, as the midnight-UTC Date that bookings store
export const clubToday = (now = new Date()) => new Date(`${clubTodayKey(now)}T00:00:00.000Z`);

// the real moment a slot starts: `day` is a "YYYY-MM-DD" key or a stored booking date
export const slotStartInstant = (day, startTime) => {
    const midnightLabel = typeof day === "string" ? Date.parse(`${day}T00:00:00.000Z`) : day.getTime();
    const wallClock = midnightLabel + startTime * 60 * 1000;
    // wall-clock time read as UTC, shifted back by the club's offset (checked twice so a DST change is handled)
    const guess = wallClock - offsetAt(new Date(wallClock));
    return new Date(wallClock - offsetAt(new Date(guess)));
};

export const slotHasStarted = (day, startTime, now = new Date()) => slotStartInstant(day, startTime) <= now;
