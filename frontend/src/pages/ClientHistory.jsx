import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import SidebarToggle from "../components/SidebarToggle";
import NotificationBell from "../components/NotificationBell";
import { ErrorPanel, LoadingPanel } from "../components/LoadState";
import { getApiError } from "../utils/clientBookings";
import { fetchClientHistory } from "../utils/clientHistory";
import { paymentMethodLabels } from "../utils/payments";

const tabs = [["activity", "Activity"], ["games", "Games"], ["payments", "Payments"]];

const kindStyles = {
    booking: { icon: "calendar", className: "bg-red-500/10 text-red-400" },
    game: { icon: "cue", className: "bg-emerald-500/10 text-emerald-400" },
    membership: { icon: "crown", className: "bg-violet-500/10 text-violet-300" },
    event: { icon: "trophy", className: "bg-amber-500/10 text-amber-300" },
    loyalty: { icon: "star", className: "bg-blue-500/10 text-blue-300" }
};

const paymentStyles = {
    pending: { label: "Awaiting verification", className: "text-amber-300" },
    paid: { label: "Paid", className: "text-emerald-400" },
    rejected: { label: "Rejected", className: "text-red-400" },
    cancelled: { label: "Cancelled", className: "text-neutral-500" },
    refunded: { label: "Refunded", className: "text-blue-300" }
};

// activity statuses worth a label; the rest are implied by the title
const statusLabels = { pending: "Pending", approved: "Approved", rejected: "Rejected", completed: "Completed", cancelled: "Cancelled", active: "Active", expired: "Expired", registered: "Awaiting verification", confirmed: "Confirmed" };

const clubMethodLabels = { cash: "Cash", card: "Card", online: "Online" };

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        cue: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4" /></>,
        star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z" />,
        wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" /><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        empty: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9h.01M15 9h.01" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const formatDate = (value, options = { day: "numeric", month: "short", year: "numeric" }) => new Date(value).toLocaleDateString("en-US", options);
const formatDateTime = (value) => `${formatDate(value, { day: "numeric", month: "short" })}, ${new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
const formatPkr = (amount) => `PKR ${amount.toLocaleString()}`;
const formatPlayTime = (minutes) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim() : `${minutes}m`);

function Stat({ icon, label, value, detail, index }) {
    return <article className="dashboard-rise rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-4 sm:p-5" style={{ animationDelay: `${80 + index * 50}ms` }}><div className="flex items-start justify-between gap-2"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">{label}</p><Icon name={icon} className="h-4 w-4 text-red-500" /></div><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-0.5 truncate text-[11px] text-neutral-600">{detail}</p></article>;
}

function Empty({ title, text }) {
    return <div className="py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] text-neutral-600"><Icon name="empty" className="h-6 w-6" /></span><p className="mt-4 text-sm font-semibold text-neutral-300">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs text-neutral-600">{text}</p></div>;
}

function ActivityList({ activity }) {
    if (!activity.length) return <Empty title="Nothing here yet" text="Your bookings, games, memberships, events, and points will appear here." />;
    return (
        <ul className="divide-y divide-white/[0.06]">
            {activity.map((item) => {
                const style = kindStyles[item.kind] || kindStyles.booking;
                const row = <><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.className}`}><Icon name={style.icon} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-200">{item.title}</p><p className="mt-0.5 truncate text-[11px] text-neutral-600">{[item.detail, item.kind !== "loyalty" && statusLabels[item.status]].filter(Boolean).join(" · ")}</p></div><div className="shrink-0 text-right">{item.amount > 0 && <p className="text-sm font-bold text-neutral-300">{formatPkr(item.amount)}</p>}<p className="text-[10px] text-neutral-600">{formatDateTime(item.date)}</p></div></>;
                return <li key={item.id}>{item.link ? <Link to={item.link} className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-white/[0.025]">{row}</Link> : <div className="flex items-center gap-4 py-3.5">{row}</div>}</li>;
            })}
        </ul>
    );
}

function GamesList({ games }) {
    if (!games.length) return <Empty title="No games yet" text="Games the club records against your account will show here with their time and bill." />;
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="text-[9px] uppercase tracking-wider text-neutral-600"><th className="pb-3 font-bold">Date</th><th className="pb-3 font-bold">Table</th><th className="pb-3 font-bold">Type</th><th className="pb-3 font-bold">Played</th><th className="pb-3 text-right font-bold">Bill</th></tr></thead>
                <tbody className="divide-y divide-white/[0.06]">
                    {games.map((game) => <tr key={game.id}><td className="py-3.5 text-neutral-400">{formatDateTime(game.startTime)}</td><td className="py-3.5"><p className="font-semibold text-neutral-200">{game.tableName}</p><p className="text-[11px] text-neutral-600">{game.branchName.replace("GOODSHOT ", "")}</p></td><td className="py-3.5 text-neutral-400">{game.type === "century" ? "Century" : "Frame"}</td><td className="py-3.5 text-neutral-400">{game.status === "active" ? <span className="font-semibold text-emerald-400">In progress</span> : formatPlayTime(game.duration)}</td><td className="py-3.5 text-right">{game.status === "active" ? <span className="text-neutral-600">—</span> : <><p className="font-bold text-neutral-200">{formatPkr(game.finalAmount)}</p>{game.discountApplied > 0 && <p className="text-[10px] text-emerald-400">saved {formatPkr(game.discountApplied)}</p>}</>}</td></tr>)}
                </tbody>
            </table>
        </div>
    );
}

function PaymentsList({ payments }) {
    if (!payments.length) return <Empty title="No payments yet" text="Advances, membership fees, entry fees, and payments at the club will be listed here." />;
    return (
        <ul className="divide-y divide-white/[0.06]">
            {payments.map((payment) => {
                const style = paymentStyles[payment.status] || paymentStyles.pending;
                const method = paymentMethodLabels[payment.method] || clubMethodLabels[payment.method] || payment.method;
                return <li key={payment.id} className="flex items-center gap-4 py-3.5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-neutral-400"><Icon name="wallet" className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-200">{payment.description}</p><p className="mt-0.5 truncate text-[11px] text-neutral-600">{[method, payment.transactionId && `Txn ${payment.transactionId}`, formatDateTime(payment.date)].filter(Boolean).join(" · ")}</p></div><div className="shrink-0 text-right"><p className={`text-sm font-black ${payment.status === "paid" ? "text-white" : "text-neutral-500"}`}>{formatPkr(payment.amount)}</p><p className={`text-[10px] font-semibold ${style.className}`}>{style.label}</p></div></li>;
            })}
        </ul>
    );
}

export default function ClientHistory() {
    const { user } = useSelector((state) => state.auth);
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = tabs.some(([value]) => value === searchParams.get("tab")) ? searchParams.get("tab") : "activity";
    const [history, setHistory] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();

    useEffect(() => {
        let active = true;
        fetchClientHistory()
            .then((data) => active && setHistory(data))
            .catch((fetchError) => active && setLoadError(getApiError(fetchError, "Your history could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [reloadCount]);

    let content;
    if (loadError) {
        content = <ErrorPanel message={loadError} onRetry={() => { setLoadError(""); setReloadCount((count) => count + 1); }} />;
    } else if (!history) {
        content = <LoadingPanel label="Loading history" />;
    } else {
        const { summary } = history;
        content = (
            <>
                <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Summary">
                    <Stat index={0} icon="cue" label="Games played" value={summary.gamesPlayed} detail={`${formatPlayTime(summary.minutesPlayed)} at the table`} />
                    <Stat index={1} icon="wallet" label="Total paid" value={formatPkr(summary.totalPaid)} detail="Verified payments" />
                    <Stat index={2} icon="calendar" label="Bookings" value={summary.bookings} detail={`${summary.completedBookings} completed`} />
                    <Stat index={3} icon="trophy" label="Events joined" value={summary.eventsJoined} detail="Confirmed spots" />
                    <Stat index={4} icon="star" label="Loyalty points" value={summary.loyaltyPoints.toLocaleString()} detail={`Worth ${formatPkr(summary.loyaltyPoints)}`} />
                    <Stat index={5} icon="crown" label="Membership" value={summary.membership?.plan || "Basic"} detail={summary.membership ? `Until ${formatDate(summary.membership.expiryDate)}` : `Member since ${formatDate(summary.memberSince, { month: "short", year: "numeric" })}`} />
                </section>
                <div className="dashboard-rise mt-8 inline-flex rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-1.5" role="tablist" aria-label="History views" style={{ animationDelay: "380ms" }}>{tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setSearchParams(value === "activity" ? {} : { tab: value }, { replace: true })} className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${tab === value ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "text-neutral-500 hover:bg-white/[0.05] hover:text-white"}`}>{label}</button>)}</div>
                <section className="dashboard-rise mt-4 rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "420ms" }}>
                    {tab === "games" ? <GamesList games={history.games} /> : tab === "payments" ? <PaymentsList payments={history.payments} /> : <ActivityList activity={history.activity} />}
                </section>
            </>
        );
    }

    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><div className="flex items-center gap-3"><SidebarToggle /><NotificationBell /><Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link><section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Your record</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">My history.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Every booking, game, payment, membership, and point in one place.</p></section>{content}</main></div>;
}
