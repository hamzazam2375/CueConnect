import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";
import { saveClientBooking } from "../utils/clientBookings";

const KEYS = {
    branch: "cueconnect_booking_branch",
    table: "cueconnect_booking_table",
    date: "cueconnect_booking_date",
    time: "cueconnect_booking_time",
    duration: "cueconnect_booking_duration"
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        calendar: <><path d="M6 2v4m12-4v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        table: <><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M7 17v3m10-3v3" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></>,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h3" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const formatTime = (minutes) => {
    const normalized = minutes % 1440;
    const hour = Math.floor(normalized / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const parseDate = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const createBookingReference = (date) => `CC-${date.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

const clearDraft = () => Object.values(KEYS).forEach((key) => sessionStorage.removeItem(key));

function Progress() {
    return (
        <ol className="dashboard-rise mt-8 flex max-w-2xl items-center" style={{ animationDelay: "70ms" }} aria-label="Booking progress">
            {["Branch", "Table", "Schedule", "Confirm"].map((step, index) => (
                <li key={step} className={`flex items-center ${index < 3 ? "flex-1" : ""}`}>
                    <div className="flex flex-col items-center gap-2">
                        <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${index < 3 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500 bg-red-600 text-white shadow-lg shadow-red-950"}`}>{index < 3 ? <Icon name="check" className="h-4 w-4" /> : 4}</span>
                        <span className={`text-[10px] font-semibold ${index < 3 ? "text-emerald-500" : "text-white"}`}>{step}</span>
                    </div>
                    {index < 3 && <span className="mx-2 mb-5 h-px flex-1 bg-emerald-500/25 sm:mx-4" />}
                </li>
            ))}
        </ol>
    );
}

function DetailCard({ icon, label, title, detail, editTo }) {
    return (
        <article className="dashboard-card rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name={icon} /></span>
                <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">{label}</p><h2 className="mt-1 truncate text-base font-bold text-neutral-100">{title}</h2><p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p></div>
                <Link to={editTo} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.07] text-neutral-600 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400" aria-label={`Edit ${label}`}><Icon name="edit" className="h-3.5 w-3.5" /></Link>
            </div>
        </article>
    );
}

export default function ClientBookingReview() {
    const { user } = useSelector((state) => state.auth);
    const branchId = sessionStorage.getItem(KEYS.branch);
    const tableValue = sessionStorage.getItem(KEYS.table);
    const dateValue = sessionStorage.getItem(KEYS.date);
    const timeValue = sessionStorage.getItem(KEYS.time);
    const durationValue = sessionStorage.getItem(KEYS.duration);
    const branch = branches.find((item) => item.id === branchId);
    const tableIndex = tableValue === null ? Number.NaN : Number(tableValue);
    const table = branch?.tables[tableIndex];
    const startTime = timeValue === null ? Number.NaN : Number(timeValue);
    const duration = Number(durationValue);
    const bookingDate = dateValue ? parseDate(dateValue) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleValid = bookingDate && bookingDate >= today && Number.isFinite(startTime) && [1, 2, 3].includes(duration);
    const [accepted, setAccepted] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [saveError, setSaveError] = useState("");

    if (!branch) return <Navigate to="/client/book" replace />;
    if (!table || table.status !== "available") return <Navigate to="/client/book/table" replace />;
    if (!scheduleValid) return <Navigate to="/client/book/schedule" replace />;

    const endTime = startTime + duration * 60;
    const total = table.pricePerHour * duration;
    const displayDate = bookingDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const confirmBooking = () => {
        if (!accepted) return;
        const reference = createBookingReference(dateValue);
        const booking = {
            reference,
            clientId: user.id,
            clientEmail: user.email,
            branchId,
            branchName: branch.name,
            tableIndex,
            tableName: table.name,
            tableType: table.type,
            date: dateValue,
            startTime,
            endTime,
            duration,
            hourlyRate: table.pricePerHour,
            total,
            status: "pending"
        };

        try {
            saveClientBooking(booking);
            clearDraft();
            setConfirmedBooking(booking);
            setSaveError("");
        } catch {
            setSaveError("Booking could not be saved in this browser. Please free storage and try again.");
        }
    };

    if (confirmedBooking) {
        return <BookingSuccess booking={confirmedBooking} user={user} />;
    }

    return (
        <PageShell user={user}>
            <Link to="/client/book/schedule" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Edit schedule</Link>
            <section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">New booking · Final step</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Review your booking.</h1><p className="mt-3 max-w-2xl text-sm text-neutral-500 sm:text-base">Check every detail before confirming your table request.</p></section>
            <Progress />

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <section className="dashboard-rise space-y-4" style={{ animationDelay: "130ms" }}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <DetailCard icon="pin" label="Branch" title={branch.name.replace("GOODSHOT ", "")} detail={branch.address} editTo="/client/book" />
                        <DetailCard icon="table" label="Table" title={`${table.name} · ${table.type}`} detail={`PKR ${table.pricePerHour}/hour · PKR ${table.frameRate}/frame`} editTo="/client/book/table" />
                        <DetailCard icon="calendar" label="Date" title={displayDate} detail="Booking date" editTo="/client/book/schedule" />
                        <DetailCard icon="clock" label="Schedule" title={`${formatTime(startTime)} – ${formatTime(endTime)}`} detail={`${duration} ${duration === 1 ? "hour" : "hours"} of play`} editTo="/client/book/schedule" />
                    </div>

                    <article className="rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6">
                        <div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400"><Icon name="shield" className="h-4 w-4" /></span><div><h2 className="text-sm font-bold">Booking rules</h2><ul className="mt-3 space-y-2 text-xs leading-relaxed text-neutral-500"><li>· Please arrive at least 10 minutes before your selected time.</li><li>· Your request remains pending until the club confirms availability.</li><li>· Advance payment requirements will be communicated after approval.</li><li>· Late arrival may reduce your reserved playing time.</li></ul></div></div>
                    </article>
                </section>

                <aside className="dashboard-rise h-fit rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6 lg:sticky lg:top-6" style={{ animationDelay: "200ms" }}>
                    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name="receipt" /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">Price summary</p><h2 className="mt-0.5 text-lg font-bold">Booking total</h2></div></div>
                    <div className="mt-6 space-y-3 border-b border-white/[0.07] pb-5 text-sm"><div className="flex justify-between text-neutral-500"><span>Hourly rate</span><span>PKR {table.pricePerHour}</span></div><div className="flex justify-between text-neutral-500"><span>Duration</span><span>× {duration}</span></div><div className="flex justify-between text-neutral-500"><span>Service fee</span><span className="text-emerald-400">Free</span></div></div>
                    <div className="flex items-end justify-between py-5"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">Estimated total</p><p className="mt-1 text-xs text-neutral-600">Payable after approval</p></div><p className="text-2xl font-black text-red-400">PKR {total.toLocaleString()}</p></div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
                        <span className="text-[11px] leading-relaxed text-neutral-500">I have reviewed the booking details and agree to the club rules.</span>
                    </label>
                    {saveError && <p className="mt-3 text-xs text-red-400" role="alert">{saveError}</p>}
                    <button type="button" onClick={confirmBooking} disabled={!accepted} className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">Confirm booking <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
                    <p className="mt-3 text-center text-[10px] leading-relaxed text-neutral-700">No payment will be charged at this stage.</p>
                </aside>
            </div>
        </PageShell>
    );
}

function PageShell({ user, children }) {
    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /><div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" /></div>
            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div></div></div></header>
            <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">{children}</main>
        </div>
    );
}

function BookingSuccess({ booking, user }) {
    const bookAnother = () => clearDraft();
    return (
        <PageShell user={user}>
            <section className="dashboard-rise mx-auto max-w-2xl py-8 text-center sm:py-16">
                <div className="relative mx-auto grid h-24 w-24 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" /><span className="relative grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span></div>
                <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">Request received</p><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Booking confirmed locally.</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-500">Your request has been saved in this browser. Backend approval will be connected in the next development phase.</p>
                <div className="mx-auto mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-6 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600">Booking reference</p><p className="mt-2 break-all text-2xl font-black tracking-wider text-red-400">{booking.reference}</p><div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-5 text-sm"><div><p className="text-[9px] uppercase text-neutral-700">Club</p><p className="mt-1 font-bold text-neutral-300">{booking.branchName.replace("GOODSHOT ", "")}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Table</p><p className="mt-1 font-bold text-neutral-300">{booking.tableName}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Date</p><p className="mt-1 font-bold text-neutral-300">{parseDate(booking.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Time</p><p className="mt-1 font-bold text-neutral-300">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</p></div></div></div>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/client/dashboard" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold transition-colors hover:bg-red-500">Go to dashboard</Link><Link to="/client/book" onClick={bookAnother} className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-6 py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white">Book another table</Link></div>
            </section>
        </PageShell>
    );
}
