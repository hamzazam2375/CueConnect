import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { cancelClientBooking, getBookingsForUser } from "../utils/clientBookings";

const statusStyles = {
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    completed: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    cancelled: "border-neutral-600/30 bg-neutral-700/20 text-neutral-500"
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        calendar: <><path d="M6 2v4m12-4v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        table: <><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M7 17v3m10-3v3" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        ticket: <><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2z" /><path d="M13 5v2m0 4v2m0 4v2" /></>,
        close: <path d="M18 6 6 18M6 6l12 12" />,
        receipt: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 7h6m-6 4h6m-6 4h3" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const formatTime = (minutes) => {
    const normalized = minutes % 1440;
    const hour = Math.floor(normalized / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const formatDate = (value, options = { month: "short", day: "numeric", year: "numeric" }) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", options);
};

function StatusBadge({ status }) {
    const normalized = statusStyles[status] ? status : "pending";
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusStyles[normalized]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{normalized}</span>;
}

function BookingCard({ booking, onView, delay }) {
    return (
        <article className="dashboard-rise dashboard-card group rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: delay }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">{booking.reference}</p><h2 className="mt-2 text-xl font-black text-white">{booking.branchName.replace("GOODSHOT ", "")}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-600">{booking.tableName} · {booking.tableType}</p></div>
                <StatusBadge status={booking.status} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/[0.07] py-4 sm:grid-cols-3">
                <div className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-red-500" /><span><span className="block text-[9px] uppercase text-neutral-700">Date</span><span className="block text-xs font-bold text-neutral-300">{formatDate(booking.date)}</span></span></div>
                <div className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4 text-red-500" /><span><span className="block text-[9px] uppercase text-neutral-700">Time</span><span className="block text-xs font-bold text-neutral-300">{formatTime(booking.startTime)}</span></span></div>
                <div className="hidden items-center gap-2 sm:flex"><Icon name="receipt" className="h-4 w-4 text-red-500" /><span><span className="block text-[9px] uppercase text-neutral-700">Total</span><span className="block text-xs font-bold text-neutral-300">PKR {booking.total.toLocaleString()}</span></span></div>
            </div>
            <div className="mt-4 flex items-center justify-between"><p className="text-xs text-neutral-600">{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</p><button type="button" onClick={() => onView(booking)} className="group/button inline-flex items-center gap-2 text-xs font-bold text-neutral-300 transition-colors hover:text-red-400">View details <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover/button:translate-x-1" /></button></div>
        </article>
    );
}

export default function ClientBookings() {
    const { user } = useSelector((state) => state.auth);
    const [bookings, setBookings] = useState(() => getBookingsForUser(user));
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [bookingToCancel, setBookingToCancel] = useState(null);
    const pendingCount = bookings.filter((booking) => booking.status === "pending").length;

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /><div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" /></div>
            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div></div></div></header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
                <Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link>
                <section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Your activity</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">My bookings.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Track all your table requests in one place.</p></div><Link to="/client/book" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-red-500">New booking <Icon name="arrow" className="h-4 w-4" /></Link></section>

                <section className="dashboard-rise mt-8 grid grid-cols-2 gap-3 sm:max-w-lg" style={{ animationDelay: "80ms" }}><div className="rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">Total bookings</p><p className="mt-2 text-3xl font-black">{bookings.length}</p></div><div className="rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">Pending</p><p className="mt-2 text-3xl font-black text-amber-400">{pendingCount}</p></div></section>

                {bookings.length ? (
                    <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Your bookings">{bookings.map((booking, index) => <BookingCard key={booking.reference} booking={booking} onView={setSelectedBooking} delay={`${120 + index * 55}ms`} />)}</section>
                ) : (
                    <section className="dashboard-rise mt-8 rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-16 text-center" style={{ animationDelay: "120ms" }}><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon name="ticket" className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-black">No bookings yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">Your confirmed booking requests will appear here.</p><Link to="/client/book" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">Book your first table <Icon name="arrow" className="h-4 w-4" /></Link></section>
                )}
            </main>

            {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onCancel={setBookingToCancel} />}
            {bookingToCancel && (
                <CancellationModal
                    booking={bookingToCancel}
                    onClose={() => setBookingToCancel(null)}
                    onCancelled={(updatedBooking) => {
                        setBookings((current) => current.map((booking) => booking.reference === updatedBooking.reference ? updatedBooking : booking));
                        setSelectedBooking((current) => current?.reference === updatedBooking.reference ? updatedBooking : current);
                        setBookingToCancel(null);
                    }}
                />
            )}
        </div>
    );
}

function BookingModal({ booking, onClose, onCancel }) {
    const canCancel = ["pending", "approved"].includes(booking.status);

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
            <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close booking details" />
            <article className="dashboard-rise relative z-10 w-full max-w-lg rounded-3xl border border-white/[0.1] bg-neutral-950 p-6 shadow-2xl shadow-black sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-500">Booking details</p><h2 id="booking-detail-title" className="mt-2 text-xl font-black">{booking.reference}</h2></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:bg-white/[0.05] hover:text-white" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button></div>
                <div className="mt-5"><StatusBadge status={booking.status} /></div>
                <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-white/[0.07] py-5">
                    <Detail icon="pin" label="Branch" value={booking.branchName.replace("GOODSHOT ", "")} />
                    <Detail icon="table" label="Table" value={`${booking.tableName} · ${booking.tableType}`} />
                    <Detail icon="calendar" label="Date" value={formatDate(booking.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} />
                    <Detail icon="clock" label="Schedule" value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`} />
                </dl>
                <div className="mt-5 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Duration</p><p className="mt-1 text-sm font-bold text-neutral-300">{booking.duration} {booking.duration === 1 ? "hour" : "hours"}</p></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Estimated total</p><p className="mt-1 text-xl font-black text-red-400">PKR {booking.total.toLocaleString()}</p></div></div>
                {booking.status === "cancelled" && booking.cancellationReason && <div className="mt-5 rounded-xl border border-red-500/10 bg-red-500/[0.05] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-red-500/70">Cancellation reason</p><p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{booking.cancellationReason}</p></div>}
                {booking.status === "pending" && <Link to={`/client/bookings/${encodeURIComponent(booking.reference)}/reschedule`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white"><Icon name="calendar" className="h-4 w-4" /> Reschedule booking</Link>}
                {canCancel && <button type="button" onClick={() => onCancel(booking)} className="mt-6 w-full rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/15">Cancel booking</button>}
                <p className="mt-6 rounded-xl bg-white/[0.025] px-4 py-3 text-center text-[10px] leading-relaxed text-neutral-600">This booking is stored locally until backend booking sync is connected.</p>
            </article>
        </div>
    );
}

function CancellationModal({ booking, onClose, onCancelled }) {
    const [reason, setReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState("");

    const confirmCancellation = () => {
        if (isCancelling) return;
        setIsCancelling(true);
        setError("");

        try {
            const updatedBooking = cancelClientBooking(booking.reference, reason);
            onCancelled(updatedBooking);
        } catch (cancellationError) {
            setError(cancellationError.message || "Booking could not be cancelled.");
            setIsCancelling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title">
            <button type="button" className="absolute inset-0 cursor-default" onClick={isCancelling ? undefined : onClose} aria-label="Close cancellation dialog" />
            <article className="dashboard-rise relative z-10 w-full max-w-md rounded-3xl border border-red-500/15 bg-neutral-950 p-6 shadow-2xl shadow-black sm:p-7">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-500">Cancel booking</p><h2 id="cancel-booking-title" className="mt-2 text-xl font-black">Are you sure?</h2></div><button type="button" onClick={onClose} disabled={isCancelling} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed" aria-label="Close"><Icon name="close" className="h-4 w-4" /></button></div>
                <p className="mt-4 text-sm leading-relaxed text-neutral-500">This will cancel <strong className="text-neutral-300">{booking.reference}</strong> for {booking.tableName}. This action cannot be reversed from the client dashboard.</p>
                <label className="mt-5 block"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Reason <span className="normal-case tracking-normal text-neutral-700">(optional)</span></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={4} placeholder="Tell the club why you are cancelling..." className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-black/50 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 outline-none transition-colors focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10" /></label>
                <div className="mt-1 text-right text-[9px] text-neutral-700">{reason.length}/300</div>
                {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>}
                <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={isCancelling} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-bold text-neutral-400 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed">Keep booking</button><button type="button" onClick={confirmCancellation} disabled={isCancelling} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900">{isCancelling ? "Cancelling..." : "Yes, cancel"}</button></div>
            </article>
        </div>
    );
}

function Detail({ icon, label, value }) {
    return <div className="flex gap-2.5"><Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><div><dt className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</dt><dd className="mt-1 text-xs font-bold text-neutral-300">{value}</dd></div></div>;
}
