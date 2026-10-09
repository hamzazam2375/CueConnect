import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { cancelPendingMembership, getMembershipsForUser } from "../utils/clientMemberships";

const statusStyles = {
    payment_pending: { label: "Payment pending", className: "border-amber-400/20 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
    active: { label: "Active", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
    expired: { label: "Expired", className: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400", dot: "bg-neutral-500" },
    cancelled: { label: "Cancelled", className: "border-red-500/20 bg-red-500/10 text-red-400", dot: "bg-red-500" }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
        ticket: <><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        close: <path d="M18 6 6 18M6 6l12 12" />,
        alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
        empty: <><circle cx="12" cy="12" r="9" /><path d="M8 15h8M9 9h.01M15 9h.01" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const effectiveStatus = (membership) => (
    membership.status === "active" && membership.expiresAt && new Date(membership.expiresAt) < new Date()
        ? "expired"
        : membership.status
);

const formatDate = (value) => value
    ? new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "Not available";

function StatusBadge({ status }) {
    const config = statusStyles[status] || statusStyles.payment_pending;
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${config.className}`}><span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />{config.label}</span>;
}

function MembershipCard({ membership, index, onDetails, onCancel }) {
    const status = effectiveStatus(membership);
    const renewal = status === "active" ? `Renews or expires ${formatDate(membership.expiresAt)}` : status === "payment_pending" ? "Activation starts after payment" : status === "expired" ? `Expired ${formatDate(membership.expiresAt)}` : `Cancelled ${formatDate(membership.cancelledAt)}`;
    return <article className="dashboard-rise dashboard-card overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950/85" style={{ animationDelay: `${80 + index * 60}ms` }}><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-400"><Icon name="crown" /></span><StatusBadge status={status} /></div><div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">{membership.plan} membership</p><h2 className="mt-1.5 text-xl font-black">PKR {membership.amount.toLocaleString()}</h2><p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600"><Icon name="pin" className="h-3.5 w-3.5" />{membership.plan === "Platinum" ? "All branches" : membership.branchName.replace("GOODSHOT ", "")}</p></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Reference</p><p className="mt-1 truncate text-xs font-bold text-neutral-400">{membership.reference}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Renewal</p><p className="mt-1 text-xs font-semibold text-neutral-500">{renewal}</p></div></div></div><div className="flex border-t border-white/[0.07]"><button type="button" onClick={() => onDetails(membership)} className="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white">View details <Icon name="arrow" className="h-3.5 w-3.5" /></button>{status === "payment_pending" && <button type="button" onClick={() => onCancel(membership)} className="border-l border-white/[0.07] px-5 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10">Cancel</button>}</div></article>;
}

export default function ClientMembershipHistory() {
    const { user } = useSelector((state) => state.auth);
    const [memberships, setMemberships] = useState(() => getMembershipsForUser(user));
    const [selected, setSelected] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [error, setError] = useState("");
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    const counts = useMemo(() => memberships.reduce((summary, membership) => {
        const status = effectiveStatus(membership);
        summary[status] = (summary[status] || 0) + 1;
        return summary;
    }, {}), [memberships]);

    const confirmCancellation = () => {
        if (!cancelling) return;
        setError("");
        try {
            const updated = cancelPendingMembership(cancelling.reference);
            setMemberships((current) => current.map((item) => item.reference === updated.reference ? updated : item));
            if (selected?.reference === updated.reference) setSelected(updated);
            setCancelling(null);
        } catch (cancelError) {
            setError(cancelError.message || "Membership request could not be cancelled.");
        }
    };

    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link><section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Membership centre</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">My memberships.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Track requests, payment state, activation and renewal dates.</p></div><Link to="/client/memberships" className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-red-500">Explore plans <Icon name="arrow" className="h-4 w-4" /></Link></section><section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Total" value={memberships.length} /><Stat label="Payment pending" value={counts.payment_pending || 0} accent="amber" /><Stat label="Active" value={counts.active || 0} accent="green" /><Stat label="Past" value={(counts.expired || 0) + (counts.cancelled || 0)} /></section>{error && <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}{memberships.length ? <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{memberships.map((membership, index) => <MembershipCard key={membership.reference} membership={membership} index={index} onDetails={setSelected} onCancel={setCancelling} />)}</section> : <section className="dashboard-rise mt-8 rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-neutral-600"><Icon name="empty" className="h-7 w-7" /></span><h2 className="mt-5 text-xl font-bold">No membership requests yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">Compare plans and choose one when you are ready to unlock club benefits.</p><Link to="/client/memberships" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">View membership plans</Link></section>}</main>{selected && <DetailsModal membership={selected} onClose={() => setSelected(null)} onCancel={() => { setSelected(null); setCancelling(selected); }} />}{cancelling && <CancelModal membership={cancelling} onClose={() => setCancelling(null)} onConfirm={confirmCancellation} />}</div>;
}

function Stat({ label, value, accent }) {
    const color = accent === "amber" ? "text-amber-300" : accent === "green" ? "text-emerald-400" : "text-white";
    return <article className="dashboard-rise rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-2 text-2xl font-black ${color}`}>{value}</p></article>;
}

function DetailsModal({ membership, onClose, onCancel }) {
    const status = effectiveStatus(membership);
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="membership-details-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><article className="dashboard-rise w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#0b0b0b] p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><StatusBadge status={status} /><h2 id="membership-details-title" className="mt-4 text-2xl font-black">{membership.plan} membership</h2><p className="mt-1 text-xs text-neutral-600">{membership.reference}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 hover:bg-white/[0.05] hover:text-white" aria-label="Close details"><Icon name="close" className="h-4 w-4" /></button></div><div className="mt-7 grid grid-cols-2 gap-5"><ModalDetail label="Branch" value={membership.plan === "Platinum" ? "All branches" : membership.branchName.replace("GOODSHOT ", "")} /><ModalDetail label="Price" value={`PKR ${membership.amount.toLocaleString()}`} /><ModalDetail label="Payment method" value={membership.paymentMethodName} /><ModalDetail label="Discount" value={`${membership.discount}% on play`} /><ModalDetail label="Requested" value={formatDate(membership.createdAt)} /><ModalDetail label="Expiry / renewal" value={status === "active" || status === "expired" ? formatDate(membership.expiresAt) : "After activation"} /></div><div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-xs leading-relaxed text-neutral-600">{status === "payment_pending" ? "Complete payment to activate membership benefits." : status === "active" ? "Your membership benefits are currently available." : status === "expired" ? "Choose a plan again to renew your membership." : "This request was cancelled and cannot be activated."}</div>{status === "payment_pending" && <button type="button" onClick={onCancel} className="mt-5 w-full rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/15">Cancel pending request</button>}</article></div>;
}

function ModalDetail({ label, value }) {
    return <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className="mt-1 text-sm font-bold text-neutral-300">{value}</p></div>;
}

function CancelModal({ membership, onClose, onConfirm }) {
    return <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cancel-membership-title"><article className="dashboard-rise w-full max-w-md rounded-3xl border border-red-500/15 bg-[#0b0b0b] p-6 text-center shadow-2xl sm:p-7"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400"><Icon name="alert" className="h-7 w-7" /></span><h2 id="cancel-membership-title" className="mt-5 text-xl font-black">Cancel this request?</h2><p className="mt-2 text-sm leading-relaxed text-neutral-500">{membership.plan} membership request <strong className="text-neutral-300">{membership.reference}</strong> will be marked as cancelled.</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-bold text-neutral-400 hover:bg-white/[0.05]">Keep request</button><button type="button" onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold hover:bg-red-500">Yes, cancel</button></div></article></div>;
}
