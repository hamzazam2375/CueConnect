import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useParams } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";
import { getBookingsForUser, rescheduleClientBooking } from "../utils/clientBookings";

const HOURS = {
    "iqbal-town": { open: 720, close: 1560 },
    "link-road": { open: 780, close: 1620 }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        calendar: <><path d="M6 2v4m12-4v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        spark: <path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2z" />,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2" /><path d="M17 21v-8H7v8M7 3v5h8" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const getToday = () => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
};

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromDateKey = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const formatTime = (minutes) => {
    const normalized = minutes % 1440;
    const hour = Math.floor(normalized / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const mockBusy = (date, slotIndex, tableIndex) => (date.getDate() + slotIndex * 2 + tableIndex * 3) % 9 === 0;

export default function ClientBookingReschedule() {
    const { reference } = useParams();
    const { user } = useSelector((state) => state.auth);
    const booking = getBookingsForUser(user).find((item) => item.reference === reference);
    const branch = branches.find((item) => item.id === booking?.branchId);
    const table = branch?.tables[booking?.tableIndex];
    const hours = HOURS[booking?.branchId];
    const today = getToday();
    const originalDateIsValid = booking?.date && fromDateKey(booking.date) >= today;
    const [selectedDate, setSelectedDate] = useState(originalDateIsValid ? booking.date : "");
    const [duration, setDuration] = useState([1, 2, 3].includes(booking?.duration) ? booking.duration : 1);
    const [selectedTime, setSelectedTime] = useState(Number.isFinite(booking?.startTime) ? booking.startTime : null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedBooking, setSavedBooking] = useState(null);
    const [error, setError] = useState("");

    if (!booking || booking.status !== "pending" || !branch || !table || !hours) {
        return <Navigate to="/client/bookings" replace />;
    }

    const dates = Array.from({ length: 7 }, (_, index) => {
        const value = new Date(today);
        value.setDate(today.getDate() + index);
        return value;
    });
    const selectedDateObject = selectedDate ? fromDateKey(selectedDate) : null;
    const slots = Array.from({ length: (hours.close - hours.open) / 60 }, (_, index) => hours.open + index * 60);
    const slotAvailable = (start, length = duration) => {
        if (!selectedDateObject || start + length * 60 > hours.close) return false;
        const startIndex = (start - hours.open) / 60;
        return Array.from({ length }, (_, offset) => startIndex + offset).every((index) => !mockBusy(selectedDateObject, index, booking.tableIndex));
    };

    const chooseDate = (value) => {
        if (value && fromDateKey(value) < today) return;
        setSelectedDate(value);
        setSelectedTime(null);
        setError("");
    };

    const chooseDuration = (value) => {
        setDuration(value);
        if (selectedTime !== null && !slotAvailable(selectedTime, value)) setSelectedTime(null);
        setError("");
    };

    const chooseTime = (value) => {
        if (!slotAvailable(value)) return;
        setSelectedTime(selectedTime === value ? null : value);
        setError("");
    };

    const validTime = selectedTime !== null && slots.includes(selectedTime) && slotAvailable(selectedTime);
    const total = table.pricePerHour * duration;

    const saveSchedule = () => {
        if (isSaving || !selectedDate || !validTime) return;
        setIsSaving(true);
        setError("");
        try {
            const updated = rescheduleClientBooking(booking.reference, {
                date: selectedDate,
                startTime: selectedTime,
                endTime: selectedTime + duration * 60,
                duration,
                total
            });
            setSavedBooking(updated);
        } catch (saveError) {
            setError(saveError.message || "Schedule could not be updated.");
            setIsSaving(false);
        }
    };

    if (savedBooking) {
        return (
            <PageShell user={user}>
                <section className="dashboard-rise mx-auto max-w-xl py-12 text-center sm:py-20">
                    <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span>
                    <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Schedule updated</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Your booking was rescheduled.</h1><p className="mt-3 text-sm text-neutral-500">{savedBooking.reference} remains pending for club approval.</p>
                    <div className="mt-7 rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-5"><div className="grid grid-cols-3 gap-4 text-left"><Summary label="Date" value={fromDateKey(savedBooking.date).toLocaleDateString("en", { month: "short", day: "numeric" })} /><Summary label="Time" value={formatTime(savedBooking.startTime)} /><Summary label="Total" value={`PKR ${savedBooking.total.toLocaleString()}`} accent /></div></div>
                    <Link to="/client/bookings" className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-bold hover:bg-red-500">View my bookings</Link>
                </section>
            </PageShell>
        );
    }

    return (
        <PageShell user={user}>
            <Link to="/client/bookings" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 group-hover:-translate-x-1" /> Back to my bookings</Link>
            <section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Reschedule · {booking.reference}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Choose a new schedule.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Your branch and table will remain unchanged.</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs text-neutral-400"><strong className="text-white">{table.name}</strong> · {branch.name.replace("GOODSHOT ", "")}</div></section>

            <section className="dashboard-rise mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "80ms" }}>
                <SectionTitle icon="calendar" title="New date" text="Choose today or a future date" />
                <div className="dashboard-mobile-nav mt-5 flex gap-3 overflow-x-auto pb-1">{dates.map((date, index) => { const key = toDateKey(date); const active = selectedDate === key; return <button key={key} type="button" onClick={() => chooseDate(key)} className={`min-w-[88px] flex-1 rounded-2xl border px-3 py-4 text-center ${active ? "border-red-500 bg-red-600 text-white" : "border-white/[0.07] bg-white/[0.025] text-neutral-500 hover:text-white"}`}><span className="block text-[9px] font-bold uppercase">{index === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" })}</span><strong className="mt-2 block text-2xl">{date.getDate()}</strong><span className="text-[10px]">{date.toLocaleDateString("en", { month: "short" })}</span></button>; })}</div>
                <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-neutral-300">Choose another date</p><p className="mt-1 text-[11px] text-neutral-600">Past dates are disabled.</p></div><input type="date" min={toDateKey(today)} value={selectedDate} onChange={(event) => chooseDate(event.target.value)} className="rounded-xl border border-white/[0.09] bg-black/50 px-4 py-3 text-sm font-semibold text-neutral-200 outline-none focus:border-red-500/60 sm:w-64" style={{ colorScheme: "dark" }} /></div>
            </section>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
                <section className="dashboard-rise rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "140ms" }}><SectionTitle icon="clock" title="Duration" text="Update playing time" /><div className="mt-5 grid grid-cols-3 gap-2">{[1, 2, 3].map((value) => <button key={value} type="button" onClick={() => chooseDuration(value)} className={`rounded-xl border py-4 ${duration === value ? "border-red-500 bg-red-500/10 text-red-400" : "border-white/[0.07] bg-white/[0.025] text-neutral-500"}`}><strong className="block text-xl">{value}</strong><span className="text-[9px] uppercase">{value === 1 ? "Hour" : "Hours"}</span></button>)}</div><div className="mt-5 flex justify-between rounded-xl bg-white/[0.025] px-4 py-3 text-xs"><span className="text-neutral-600">Rate</span><strong className="text-neutral-300">PKR {table.pricePerHour}/hour</strong></div></section>
                <section className="dashboard-rise rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "200ms" }}><SectionTitle icon="spark" title="Start time" text={selectedDate ? `${duration}-hour available slots` : "Select a date first"} /><div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((minutes) => { const available = slotAvailable(minutes); const active = selectedTime === minutes && available; return <button key={minutes} type="button" onClick={() => chooseTime(minutes)} disabled={!available} className={`rounded-xl border px-2 py-3 text-xs font-bold ${active ? "border-red-500 bg-red-600 text-white" : available ? "border-white/[0.07] bg-white/[0.025] text-neutral-400 hover:text-white" : "cursor-not-allowed border-white/[0.04] text-neutral-800 line-through"}`}>{formatTime(minutes)}</button>; })}</div></section>
            </div>

            <section className="dashboard-rise mt-5 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6" style={{ animationDelay: "260ms" }}><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4"><Summary label="Date" value={selectedDate ? fromDateKey(selectedDate).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"} /><Summary label="Starts" value={validTime ? formatTime(selectedTime) : "—"} /><Summary label="Ends" value={validTime ? formatTime(selectedTime + duration * 60) : "—"} /><Summary label="New total" value={`PKR ${total.toLocaleString()}`} accent /></div><button type="button" onClick={saveSchedule} disabled={isSaving || !selectedDate || !validTime} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"><Icon name="save" className="h-4 w-4" />{isSaving ? "Saving..." : "Save new schedule"}</button></div>{error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}</section>
            <p className="mt-6 text-center text-[11px] text-neutral-700">Only this booking’s date, time, duration, and estimated total will change.</p>
        </PageShell>
    );
}

function PageShell({ user, children }) {
    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">{children}</main></div>;
}

function SectionTitle({ icon, title, text }) {
    return <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name={icon} /></span><div><h2 className="text-base font-bold">{title}</h2><p className="text-xs text-neutral-600">{text}</p></div></div>;
}

function Summary({ label, value, accent = false }) {
    return <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-1.5 text-sm font-bold ${accent ? "text-red-400" : "text-neutral-300"}`}>{value}</p></div>;
}
