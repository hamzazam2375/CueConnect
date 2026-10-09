import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";

const KEYS = {
    branch: "cueconnect_booking_branch",
    table: "cueconnect_booking_table",
    date: "cueconnect_booking_date",
    time: "cueconnect_booking_time",
    duration: "cueconnect_booking_duration"
};

const HOURS = {
    "iqbal-town": { open: 720, close: 1560 },
    "link-road": { open: 780, close: 1620 }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        next: <path d="M5 12h14m-6-6 6 6-6 6" />,
        check: <path d="m5 12 4 4L19 6" />,
        calendar: <><path d="M6 2v4m12-4v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        spark: <path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2z" />,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>
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
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatTime = (minutes) => {
    const normalized = minutes % 1440;
    const hour = Math.floor(normalized / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const mockBusy = (date, slotIndex, tableIndex) => (date.getDate() + slotIndex * 2 + tableIndex * 3) % 9 === 0;

export default function ClientScheduleSelection() {
    const { user } = useSelector((state) => state.auth);
    const branchId = sessionStorage.getItem(KEYS.branch);
    const storedTableIndex = sessionStorage.getItem(KEYS.table);
    const tableIndex = storedTableIndex === null ? Number.NaN : Number(storedTableIndex);
    const branch = branches.find((item) => item.id === branchId);
    const table = branch?.tables[tableIndex];
    const hours = HOURS[branchId];
    const today = getToday();
    const dates = Array.from({ length: 7 }, (_, index) => {
        const value = new Date(today);
        value.setDate(today.getDate() + index);
        return value;
    });
    const storedDate = sessionStorage.getItem(KEYS.date) || "";
    const storedDuration = Number(sessionStorage.getItem(KEYS.duration));
    const storedTime = sessionStorage.getItem(KEYS.time);
    const minimumDate = toDateKey(today);
    const storedDateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(storedDate) && fromDateKey(storedDate) >= today;
    const [selectedDate, setSelectedDate] = useState(storedDateIsValid ? storedDate : "");
    const [duration, setDuration] = useState([1, 2, 3].includes(storedDuration) ? storedDuration : 1);
    const [selectedTime, setSelectedTime] = useState(storedTime === null ? null : Number(storedTime));
    const [saved, setSaved] = useState(false);

    if (!branch) return <Navigate to="/client/book" replace />;
    if (!table || table.status !== "available") return <Navigate to="/client/book/table" replace />;

    const selectedDateObject = selectedDate ? fromDateKey(selectedDate) : null;
    const slots = Array.from({ length: (hours.close - hours.open) / 60 }, (_, index) => hours.open + index * 60);
    const slotAvailable = (start, length = duration) => {
        if (!selectedDateObject || start + length * 60 > hours.close) return false;
        const startIndex = (start - hours.open) / 60;
        return Array.from({ length }, (_, offset) => startIndex + offset).every((index) => !mockBusy(selectedDateObject, index, tableIndex));
    };

    const chooseDate = (value) => {
        if (value && fromDateKey(value) < today) return;
        const nextValue = selectedDate === value ? "" : value;
        setSelectedDate(nextValue);
        setSelectedTime(null);
        nextValue ? sessionStorage.setItem(KEYS.date, nextValue) : sessionStorage.removeItem(KEYS.date);
        sessionStorage.removeItem(KEYS.time);
        setSaved(false);
    };

    const chooseDuration = (value) => {
        setDuration(value);
        sessionStorage.setItem(KEYS.duration, String(value));
        if (selectedTime !== null && !slotAvailable(selectedTime, value)) {
            setSelectedTime(null);
            sessionStorage.removeItem(KEYS.time);
        }
        setSaved(false);
    };

    const chooseTime = (value) => {
        if (!slotAvailable(value)) return;
        const nextValue = selectedTime === value ? null : value;
        setSelectedTime(nextValue);
        nextValue === null ? sessionStorage.removeItem(KEYS.time) : sessionStorage.setItem(KEYS.time, String(nextValue));
        setSaved(false);
    };

    const validTime = selectedTime !== null && slots.includes(selectedTime) && slotAvailable(selectedTime);
    const continueBooking = () => {
        if (!selectedDate || !validTime) return;
        sessionStorage.setItem(KEYS.duration, String(duration));
        setSaved(true);
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /><div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" /></div>

            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7">
                    <Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link>
                    <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div></div>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
                <Link to="/client/book/table" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Change table</Link>
                <section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">New booking · Step 3</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Choose your schedule.</h1><p className="mt-3 max-w-2xl text-sm text-neutral-500 sm:text-base">Select a date, duration, and available start time for your game.</p></div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs text-neutral-400"><strong className="text-white">{table.name}</strong> · {branch.name.replace("GOODSHOT ", "")}</div>
                </section>

                <ol className="dashboard-rise mt-8 flex max-w-2xl items-center" style={{ animationDelay: "70ms" }} aria-label="Booking progress">
                    {["Branch", "Table", "Schedule", "Confirm"].map((step, index) => <li key={step} className={`flex items-center ${index < 3 ? "flex-1" : ""}`}><div className="flex flex-col items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${index < 2 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : index === 2 ? "border-red-500 bg-red-600 text-white" : "border-white/10 bg-neutral-950 text-neutral-600"}`}>{index < 2 ? <Icon name="check" className="h-4 w-4" /> : index + 1}</span><span className={`text-[10px] font-semibold ${index === 2 ? "text-white" : index < 2 ? "text-emerald-500" : "text-neutral-600"}`}>{step}</span></div>{index < 3 && <span className={`mx-2 mb-5 h-px flex-1 sm:mx-4 ${index < 2 ? "bg-emerald-500/25" : "bg-white/[0.08]"}`} />}</li>)}
                </ol>

                <section className="dashboard-rise mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "120ms" }}>
                    <SectionTitle icon="calendar" title="Select a date" text="The next seven days are available" />
                    <div className="dashboard-mobile-nav mt-5 flex gap-3 overflow-x-auto pb-1">
                        {dates.map((date, index) => { const key = toDateKey(date); const active = selectedDate === key; return <button key={key} type="button" onClick={() => chooseDate(key)} className={`min-w-[88px] flex-1 rounded-2xl border px-3 py-4 text-center transition-all ${active ? "border-red-500 bg-red-600 text-white" : "border-white/[0.07] bg-white/[0.025] text-neutral-500 hover:text-white"}`}><span className="block text-[9px] font-bold uppercase">{index === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" })}</span><span className="mt-2 block text-2xl font-black">{date.getDate()}</span><span className="mt-1 block text-[10px]">{date.toLocaleDateString("en", { month: "short" })}</span></button>; })}
                    </div>
                    <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-xs font-bold text-neutral-300">Choose another date</p><p className="mt-1 text-[11px] text-neutral-600">Past dates are disabled automatically.</p></div>
                        <label className="relative block sm:w-64">
                            <span className="sr-only">Select booking date</span>
                            <input
                                type="date"
                                min={minimumDate}
                                value={selectedDate}
                                onChange={(event) => chooseDate(event.target.value)}
                                className="w-full rounded-xl border border-white/[0.09] bg-black/50 px-4 py-3 text-sm font-semibold text-neutral-200 outline-none transition-colors focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                                style={{ colorScheme: "dark" }}
                            />
                        </label>
                    </div>
                </section>

                <div className="mt-5 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
                    <section className="dashboard-rise rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "180ms" }}>
                        <SectionTitle icon="clock" title="Game duration" text="Choose how long you want to play" />
                        <div className="mt-5 grid grid-cols-3 gap-2">{[1, 2, 3].map((value) => <button key={value} type="button" onClick={() => chooseDuration(value)} className={`rounded-xl border py-4 text-center ${duration === value ? "border-red-500 bg-red-500/10 text-red-400" : "border-white/[0.07] bg-white/[0.025] text-neutral-500"}`}><strong className="block text-xl">{value}</strong><span className="text-[9px] uppercase">{value === 1 ? "Hour" : "Hours"}</span></button>)}</div>
                        <div className="mt-5 flex justify-between rounded-xl bg-white/[0.025] px-4 py-3 text-xs"><span className="text-neutral-600">Rate</span><strong className="text-neutral-300">PKR {table.pricePerHour}/hour</strong></div>
                    </section>

                    <section className="dashboard-rise rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "240ms" }}>
                        <SectionTitle icon="spark" title="Start time" text={selectedDate ? `${duration}-hour slots for selected date` : "Select a date first"} />
                        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((minutes) => { const available = slotAvailable(minutes); const active = selectedTime === minutes && available; return <button key={minutes} type="button" onClick={() => chooseTime(minutes)} disabled={!available} className={`rounded-xl border px-2 py-3 text-xs font-bold ${active ? "border-red-500 bg-red-600 text-white" : available ? "border-white/[0.07] bg-white/[0.025] text-neutral-400 hover:text-white" : "cursor-not-allowed border-white/[0.04] text-neutral-800 line-through"}`}>{formatTime(minutes)}</button>; })}</div>
                    </section>
                </div>

                <section className="dashboard-rise mt-5 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6" style={{ animationDelay: "300ms" }}>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4"><Summary label="Date" value={selectedDateObject ? selectedDateObject.toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"} /><Summary label="Time" value={validTime ? formatTime(selectedTime) : "—"} /><Summary label="Ends at" value={validTime ? formatTime(selectedTime + duration * 60) : "—"} /><Summary label="Estimated total" value={`PKR ${(table.pricePerHour * duration).toLocaleString()}`} accent /></div>
                        <button type="button" onClick={continueBooking} disabled={!selectedDate || !validTime} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600">Continue <Icon name="next" className="h-4 w-4 group-hover:translate-x-1" /></button>
                    </div>
                    {saved && <div className="mt-5 flex gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-400" role="status"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Schedule saved.</strong> Booking review and confirmation will be added next.</p></div>}
                </section>
                <p className="mt-6 text-center text-[11px] text-neutral-700">Availability is a frontend preview until the booking API is connected.</p>
            </main>
        </div>
    );
}

function SectionTitle({ icon, title, text }) {
    return <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name={icon} /></span><div><h2 className="text-base font-bold">{title}</h2><p className="text-xs text-neutral-600">{text}</p></div></div>;
}

function Summary({ label, value, accent = false }) {
    return <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-1.5 text-sm font-bold ${accent ? "text-red-400" : "text-neutral-300"}`}>{value}</p></div>;
}
