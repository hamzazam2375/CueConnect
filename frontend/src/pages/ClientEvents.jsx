import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import SidebarToggle from "../components/SidebarToggle";
import NotificationBell from "../components/NotificationBell";
import { ErrorPanel, LoadingPanel } from "../components/LoadState";
import { useNotifications } from "../components/notificationsContext";
import { getApiError } from "../utils/clientBookings";
import { cancelEventRegistration, eventTypeLabels, fetchClientEvents, fetchEventProofUrl, fetchEventRegistrations, formatEventDate, formatEventTime, formatFee } from "../utils/clientEvents";
import { paymentMethodLabels } from "../utils/payments";

const registrationStyles = {
    registered: { label: "Awaiting verification", className: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
    confirmed: { label: "Registered", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" },
    rejected: { label: "Rejected", className: "border-red-500/20 bg-red-500/10 text-red-400" },
    cancelled: { label: "Cancelled", className: "border-neutral-600/30 bg-neutral-700/20 text-neutral-500" }
};

const filters = [["all", "All"], ["tournament", "Tournaments"], ["event", "Club events"]];

export function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4" /></>,
        spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6" /></>,
        medal: <><circle cx="12" cy="15" r="6" /><path d="M8.5 9.5 6 2h4l2 5 2-5h4l-2.5 7.5" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        close: <path d="M18 6 6 18M6 6l12 12" />,
        alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        empty: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9h.01M15 9h.01" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function EventsShell({ user, children }) {
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><div className="flex items-center gap-3"><SidebarToggle /><NotificationBell /><Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">{children}</main></div>;
}

export function TypeBadge({ type }) {
    const tournament = type === "tournament";
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${tournament ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-white/[0.1] bg-white/[0.05] text-neutral-300"}`}><Icon name={tournament ? "trophy" : "spark"} className="h-3 w-3" />{eventTypeLabels[type] || type}</span>;
}

function StatusBadge({ status }) {
    const style = registrationStyles[status] || registrationStyles.registered;
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${style.className}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{style.label}</span>;
}

function EventAction({ event }) {
    const status = event.registration?.status;
    if (status === "registered" || status === "confirmed") {
        return <Link to="/client/events?tab=mine" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15"><Icon name="check" className="h-4 w-4" />{status === "confirmed" ? "You're registered" : "Awaiting verification"}</Link>;
    }
    if (!event.registrationOpen) {
        return <span className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs font-bold text-neutral-600">{event.spotsLeft === 0 ? "Fully booked" : "Registration closed"}</span>;
    }
    return <Link to={`/client/events/${event.id}`} className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-bold transition-colors hover:bg-red-500">{event.registrationFee > 0 ? "Register" : "Join for free"} <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>;
}

function EventCard({ event, index }) {
    return (
        <article className="dashboard-rise dashboard-card flex flex-col rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-5 sm:p-6" style={{ animationDelay: `${120 + index * 55}ms` }}>
            <div className="flex items-start justify-between gap-3"><TypeBadge type={event.type} />{event.spotsLeft !== null && event.registrationOpen && <span className={`text-[10px] font-bold ${event.spotsLeft <= 3 ? "text-amber-400" : "text-neutral-500"}`}>{event.spotsLeft} {event.spotsLeft === 1 ? "spot" : "spots"} left</span>}</div>
            <h2 className="mt-4 text-xl font-black leading-tight">{event.title}</h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-400"><Icon name="pin" className="h-3.5 w-3.5" />{event.branchName.replace("GOODSHOT ", "")}</p>
            {event.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-500">{event.description}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/[0.07] py-4">
                <div className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-red-500" /><span><span className="block text-[9px] uppercase text-neutral-700">Date</span><span className="block text-xs font-bold text-neutral-300">{formatEventDate(event.date, { weekday: "short", month: "short", day: "numeric" })}</span></span></div>
                <div className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4 text-red-500" /><span><span className="block text-[9px] uppercase text-neutral-700">Starts</span><span className="block text-xs font-bold text-neutral-300">{formatEventTime(event.date)}</span></span></div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
                <div>{event.prize && <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300"><Icon name="medal" className="h-4 w-4" />{event.prize}</p>}</div>
                <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Entry</p><p className="mt-0.5 text-lg font-black text-white">{formatFee(event.registrationFee)}</p></div>
            </div>
            <div className="mt-auto flex pt-5"><EventAction event={event} /></div>
        </article>
    );
}

function UpcomingView() {
    const [events, setEvents] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        let active = true;
        fetchClientEvents()
            .then((data) => active && setEvents(data))
            .catch((fetchError) => active && setLoadError(getApiError(fetchError, "Events could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [reloadCount]);

    if (loadError) return <ErrorPanel message={loadError} onRetry={() => { setLoadError(""); setReloadCount((count) => count + 1); }} />;
    if (!events) return <LoadingPanel label="Loading events" />;

    const shown = filter === "all" ? events : events.filter((event) => event.type === filter);
    return (
        <>
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter events">{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${filter === value ? "border-red-500/40 bg-red-500/15 text-red-300" : "border-white/[0.08] text-neutral-500 hover:text-white"}`}>{label}</button>)}</div>
            {shown.length ? (
                <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Upcoming events">{shown.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</section>
            ) : (
                <section className="dashboard-rise mt-6 rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-16 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon name="trophy" className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-black">{events.length ? "Nothing in this category" : "No upcoming events"}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">New tournaments and club nights are announced here. Check back soon.</p></section>
            )}
        </>
    );
}

function RegistrationsView() {
    const { notifications } = useNotifications();
    const latestNotificationId = notifications[0]?.id;
    const [registrations, setRegistrations] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const [selected, setSelected] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState("");

    // reload when a notification arrives, since the club may have confirmed or rejected one
    useEffect(() => {
        let active = true;
        fetchEventRegistrations()
            .then((data) => active && setRegistrations(data))
            .catch((fetchError) => active && setLoadError(getApiError(fetchError, "Your registrations could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [reloadCount, latestNotificationId]);

    const confirmCancel = async () => {
        if (!cancelling || isCancelling) return;
        setIsCancelling(true);
        setError("");
        try {
            const updated = await cancelEventRegistration(cancelling.reference);
            setRegistrations((current) => current.map((item) => item.reference === updated.reference ? updated : item));
        } catch (cancelError) {
            setError(getApiError(cancelError, "Registration could not be cancelled."));
        } finally {
            setCancelling(null);
            setIsCancelling(false);
        }
    };

    if (loadError) return <ErrorPanel message={loadError} onRetry={() => { setLoadError(""); setReloadCount((count) => count + 1); }} />;
    if (!registrations) return <LoadingPanel label="Loading registrations" />;
    if (!registrations.length) {
        return <section className="dashboard-rise mt-6 rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-neutral-600"><Icon name="empty" className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-bold">No registrations yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">Sign up for a tournament or club night and it will show up here.</p><Link to="/client/events" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">Browse events</Link></section>;
    }

    return (
        <>
            {error && <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}
            <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Your event registrations">
                {registrations.map((registration, index) => {
                    const { event } = registration;
                    return (
                        <article key={registration.reference} className="dashboard-rise dashboard-card overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950/85" style={{ animationDelay: `${120 + index * 55}ms` }}>
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3"><TypeBadge type={event?.type} /><StatusBadge status={registration.status} /></div>
                                <h2 className="mt-4 text-xl font-black">{event?.title || "Event removed"}</h2>
                                {event && <p className="mt-1 text-xs text-neutral-500">{event.branchName.replace("GOODSHOT ", "")} · {formatEventDate(event.date)} · {formatEventTime(event.date)}</p>}
                                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Reference</p><p className="mt-1 truncate text-xs font-bold text-neutral-400">{registration.reference}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Entry fee</p><p className="mt-1 text-xs font-bold text-neutral-400">{formatFee(registration.feePaid)}</p></div></div>
                                {registration.status === "rejected" && registration.rejectionReason && <p className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.05] px-4 py-3 text-xs leading-relaxed text-neutral-500"><span className="font-bold text-red-400/80">Reason from the club: </span>{registration.rejectionReason}</p>}
                            </div>
                            <div className="flex border-t border-white/[0.07]"><button type="button" onClick={() => setSelected(registration)} className="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white">View details <Icon name="arrow" className="h-3.5 w-3.5" /></button>{registration.canCancel && <button type="button" onClick={() => setCancelling(registration)} className="border-l border-white/[0.07] px-5 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10">Cancel</button>}</div>
                        </article>
                    );
                })}
            </section>
            {selected && <DetailsModal registration={selected} onClose={() => setSelected(null)} />}
            {cancelling && <CancelModal registration={cancelling} isCancelling={isCancelling} onClose={() => setCancelling(null)} onConfirm={confirmCancel} />}
        </>
    );
}

function DetailsModal({ registration, onClose }) {
    const { event, status } = registration;
    const account = registration.paymentAccount;
    const note = status === "registered" ? "The club is verifying your payment. Your spot is held until then." : status === "confirmed" ? "Your spot is confirmed. Please arrive 15 minutes before the start." : status === "rejected" ? "The club could not verify this payment, so the spot was released." : "You cancelled this registration.";
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="registration-details-title" onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}><article className="dashboard-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0b0b0b] p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><StatusBadge status={status} /><h2 id="registration-details-title" className="mt-4 text-2xl font-black">{event?.title || "Event"}</h2><p className="mt-1 text-xs text-neutral-600">{registration.reference}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:bg-white/[0.05] hover:text-white" aria-label="Close details"><Icon name="close" className="h-4 w-4" /></button></div><div className="mt-7 grid grid-cols-2 gap-5">{event && <><ModalDetail label="Branch" value={event.branchName.replace("GOODSHOT ", "")} /><ModalDetail label="Starts" value={`${formatEventDate(event.date, { month: "short", day: "numeric" })}, ${formatEventTime(event.date)}`} /></>}<ModalDetail label="Entry fee" value={formatFee(registration.feePaid)} />{event?.prize && <ModalDetail label="Prize" value={event.prize} />}{account && <ModalDetail label="Paid to" value={`${paymentMethodLabels[account.method] || account.method} · ${account.accountNumber}`} />}{registration.transactionId && <ModalDetail label="Transaction ID" value={registration.transactionId} />}<ModalDetail label="Registered" value={formatEventDate(registration.createdAt, { month: "short", day: "numeric", year: "numeric" })} /></div><div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs leading-relaxed text-neutral-600">{note}</div>{registration.hasPaymentProof && <ProofViewer reference={registration.reference} />}</article></div>;
}

function ModalDetail({ label, value }) {
    return <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className="mt-1 text-sm font-bold text-neutral-300">{value}</p></div>;
}

function ProofViewer({ reference }) {
    const [proofUrl, setProofUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => () => proofUrl && URL.revokeObjectURL(proofUrl), [proofUrl]);

    const toggleProof = async () => {
        if (proofUrl) return setProofUrl(null);
        setIsLoading(true);
        setError("");
        try {
            setProofUrl(await fetchEventProofUrl(reference));
        } catch (proofError) {
            setError(getApiError(proofError, "Payment proof could not be loaded."));
        } finally {
            setIsLoading(false);
        }
    };

    return <div className="mt-4"><button type="button" onClick={toggleProof} disabled={isLoading} className="text-[11px] font-bold text-neutral-400 transition-colors hover:text-red-400 disabled:cursor-wait">{isLoading ? "Loading proof..." : proofUrl ? "Hide payment proof" : "View payment proof"}</button>{error && <p className="mt-2 text-[11px] text-red-400" role="alert">{error}</p>}{proofUrl && <img src={proofUrl} alt={`Payment proof for ${reference}`} className="mt-3 max-h-64 w-full rounded-xl border border-white/[0.07] object-contain" />}</div>;
}

function CancelModal({ registration, isCancelling, onClose, onConfirm }) {
    const paid = registration.feePaid > 0;
    return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cancel-registration-title"><article className="dashboard-rise w-full max-w-md rounded-3xl border border-red-500/15 bg-[#0b0b0b] p-6 text-center shadow-2xl sm:p-7"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400"><Icon name="alert" className="h-7 w-7" /></span><h2 id="cancel-registration-title" className="mt-5 text-xl font-black">Cancel this registration?</h2><p className="mt-2 text-sm leading-relaxed text-neutral-500">Your spot in <strong className="text-neutral-300">{registration.event?.title}</strong> will be given up.{paid ? " Contact the club about your entry fee." : ""}</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={isCancelling} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-bold text-neutral-400 hover:bg-white/[0.05] disabled:cursor-not-allowed">Keep my spot</button><button type="button" onClick={onConfirm} disabled={isCancelling} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-900">{isCancelling ? "Cancelling..." : "Yes, cancel"}</button></div></article></div>;
}

export default function ClientEvents() {
    const { user } = useSelector((state) => state.auth);
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get("tab") === "mine" ? "mine" : "upcoming";

    return (
        <EventsShell user={user}>
            <Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link>
            <section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Compete & connect</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Events & tournaments.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Sign up for tournaments and club nights across Goodshot branches.</p></section>
            <div className="dashboard-rise mt-8 inline-flex rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-1.5" role="tablist" aria-label="Event views" style={{ animationDelay: "100ms" }}>{[["upcoming", "Upcoming"], ["mine", "My registrations"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setSearchParams(value === "mine" ? { tab: "mine" } : {}, { replace: true })} className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === value ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "text-neutral-500 hover:bg-white/[0.05] hover:text-white"}`}>{label}</button>)}</div>
            {tab === "mine" ? <RegistrationsView /> : <UpcomingView />}
        </EventsShell>
    );
}
