import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import SidebarToggle from "../components/SidebarToggle";
import NotificationBell from "../components/NotificationBell";
import { ErrorPanel, LoadingPanel } from "../components/LoadState";
import { getApiError } from "../utils/clientBookings";
import { fetchClientLoyalty } from "../utils/loyalty";

const historyStyles = {
    earned: { label: "Earned", sign: "+", className: "text-emerald-400", icon: "plus" },
    redeemed: { label: "Used", sign: "−", className: "text-red-400", icon: "ticket" },
    refunded: { label: "Returned", sign: "+", className: "text-blue-400", icon: "undo" }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z" />,
        plus: <path d="M12 5v14M5 12h14" />,
        ticket: <><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
        undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
        cue: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        empty: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9h.01M15 9h.01" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const formatDate = (value) => new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

function Step({ icon, title, text, index }) {
    return <article className="dashboard-rise rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: `${140 + index * 60}ms` }}><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name={icon} /></span><h2 className="mt-4 text-sm font-bold">{title}</h2><p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{text}</p></article>;
}

export default function ClientLoyalty() {
    const { user } = useSelector((state) => state.auth);
    const [loyalty, setLoyalty] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();

    useEffect(() => {
        let active = true;
        fetchClientLoyalty()
            .then((data) => active && setLoyalty(data))
            .catch((fetchError) => active && setLoadError(getApiError(fetchError, "Your loyalty points could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [reloadCount]);

    const retryLoad = () => {
        setLoadError("");
        setReloadCount((count) => count + 1);
    };

    let content;
    if (loadError) {
        content = <ErrorPanel message={loadError} onRetry={retryLoad} />;
    } else if (!loyalty) {
        content = <LoadingPanel label="Loading loyalty points" />;
    } else {
        const { points, history, rules } = loyalty;
        const maxPercent = Math.round(rules.maxRedeemRate * 100);
        content = (
            <>
                <section className="dashboard-rise mt-8 overflow-hidden rounded-3xl border border-red-500/15 bg-gradient-to-br from-red-950/40 via-neutral-950 to-neutral-950 p-6 sm:p-8" style={{ animationDelay: "80ms" }}>
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Your balance</p><p className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">{points.toLocaleString()} <span className="text-lg font-semibold text-neutral-500">{points === 1 ? "point" : "points"}</span></p><p className="mt-2 text-sm text-neutral-400">Worth PKR {(points * rules.pointValue).toLocaleString()} off your bookings.</p></div>
                        <Link to="/client/book" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-red-500">Use on a booking <Icon name="arrow" className="h-4 w-4" /></Link>
                    </div>
                </section>

                <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="How loyalty points work">
                    <Step index={0} icon="cue" title="Play and pay" text={`Earn 1 point for every PKR ${rules.pkrPerPointEarned} you pay at the club.`} />
                    <Step index={1} icon="star" title="Collect points" text="Points are added when the club records your payment, and you get a notification." />
                    <Step index={2} icon="ticket" title="Save on bookings" text={`Each point is PKR ${rules.pointValue} off. Use points for up to ${maxPercent}% of a booking total.`} />
                </section>

                <section className="dashboard-rise mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6" style={{ animationDelay: "320ms" }}>
                    <h2 className="text-lg font-bold">Points history</h2>
                    {history.length ? (
                        <ul className="mt-4 divide-y divide-white/[0.06]">
                            {history.map((entry) => {
                                const style = historyStyles[entry.type] || historyStyles.earned;
                                return <li key={entry.id} className="flex items-center gap-4 py-3.5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] ${style.className}`}><Icon name={style.icon} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-neutral-200">{entry.description || style.label}</p><p className="mt-0.5 text-[11px] text-neutral-600">{style.label} · {formatDate(entry.date)}</p></div><p className={`shrink-0 text-sm font-black ${style.className}`}>{style.sign}{entry.points.toLocaleString()}</p></li>;
                            })}
                        </ul>
                    ) : (
                        <div className="py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.03] text-neutral-600"><Icon name="empty" className="h-6 w-6" /></span><p className="mt-4 text-sm font-semibold text-neutral-300">No points yet</p><p className="mx-auto mt-1 max-w-sm text-xs text-neutral-600">Play at any Goodshot branch and your points will show up here.</p></div>
                    )}
                </section>
            </>
        );
    }

    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><div className="flex items-center gap-3"><SidebarToggle /><NotificationBell /><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link><section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Rewards</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Loyalty points.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Earn points every time you play, and spend them on your next booking.</p></section>{content}</main></div>;
}
