import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";
import { savePendingMembership } from "../utils/clientMemberships";

const SELECTION_KEY = "cueconnect_membership_selection";
const REVIEW_KEY = "cueconnect_membership_review";

const paymentMethods = [
    { id: "card", name: "Debit or credit card", description: "Visa or Mastercard through a secure gateway", icon: "card", tag: "Online" },
    { id: "jazzcash", name: "JazzCash", description: "Pay from your JazzCash mobile wallet", icon: "phone", tag: "Wallet" },
    { id: "easypaisa", name: "Easypaisa", description: "Pay from your Easypaisa mobile wallet", icon: "wallet", tag: "Wallet" },
    { id: "pay_at_club", name: "Pay at club", description: "Pay at the selected branch before activation", icon: "club", tag: "In person" }
];

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
        phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
        wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" /><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></>,
        club: <><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M9 10h.01M15 10h.01" /></>,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const loadCheckout = (user) => {
    try {
        const selection = JSON.parse(sessionStorage.getItem(SELECTION_KEY));
        const review = JSON.parse(sessionStorage.getItem(REVIEW_KEY));
        const branch = branches.find((item) => item.id === selection?.branchId);
        const planIndex = Number(selection?.planIndex);
        const membership = branch?.memberships[planIndex];
        const reviewMatches = review?.termsAccepted
            && review.branchId === branch?.id
            && Number(review.planIndex) === planIndex
            && Number(review.amount) === membership?.price
            && String(review.clientId) === String(user.id);
        if (branch && Number.isInteger(planIndex) && membership && reviewMatches) return { branch, membership, planIndex };
    } catch {
        // Invalid checkout data is handled by redirecting to review.
    }
    return null;
};

const createReference = () => {
    const random = globalThis.crypto?.getRandomValues
        ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
        : Math.random().toString(36).slice(2, 9);
    return `MEM-${Date.now().toString(36)}-${random}`.toUpperCase();
};

function MethodCard({ method, selected, onSelect }) {
    return <button type="button" onClick={onSelect} aria-pressed={selected} className={`dashboard-rise dashboard-card flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all sm:p-5 ${selected ? "border-red-500/60 bg-red-500/[0.09] shadow-[0_16px_45px_rgba(127,29,29,0.15)]" : "border-white/[0.08] bg-neutral-950/80 hover:border-white/15 hover:bg-white/[0.035]"}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${selected ? "border-red-500/20 bg-red-500/15 text-red-400" : "border-white/[0.07] bg-white/[0.035] text-neutral-500"}`}><Icon name={method.icon} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-bold text-neutral-100">{method.name}</span><span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-neutral-600">{method.tag}</span></span><span className="mt-1 block text-xs text-neutral-600">{method.description}</span></span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all ${selected ? "border-red-500 bg-red-600 text-white" : "border-white/10 text-transparent"}`}><Icon name="check" className="h-3.5 w-3.5" /></span></button>;
}

export default function ClientMembershipPayment() {
    const { user } = useSelector((state) => state.auth);
    const [checkout] = useState(() => loadCheckout(user));
    const [methodId, setMethodId] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [error, setError] = useState("");

    if (!checkout) return <Navigate to="/client/memberships/review" replace />;
    const { branch, membership, planIndex } = checkout;
    const method = paymentMethods.find((item) => item.id === methodId);

    const confirmPaymentMethod = () => {
        if (!method || confirmation) return;
        setError("");
        try {
            const saved = savePendingMembership({
                reference: createReference(),
                clientId: user.id,
                clientEmail: user.email,
                clientName: `${user.firstName} ${user.lastName}`,
                branchId: branch.id,
                branchName: branch.name,
                planIndex,
                plan: membership.plan,
                duration: membership.duration,
                discount: membership.discount,
                amount: membership.price,
                paymentMethod: method.id,
                paymentMethodName: method.name
            });
            sessionStorage.removeItem(SELECTION_KEY);
            sessionStorage.removeItem(REVIEW_KEY);
            setConfirmation(saved);
        } catch (saveError) {
            setError(saveError.message || "Payment method could not be confirmed.");
        }
    };

    if (confirmation) {
        return <PageShell user={user}><section className="dashboard-rise mx-auto max-w-2xl py-10 text-center sm:py-16"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span><p className="mt-7 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Payment method confirmed</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Membership request created.</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-neutral-500">Your {confirmation.plan} membership is marked as payment pending. No money has been charged.</p><div className="mt-7 rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6 text-left"><div className="grid grid-cols-2 gap-5 sm:grid-cols-4"><Summary label="Reference" value={confirmation.reference} /><Summary label="Plan" value={confirmation.plan} /><Summary label="Method" value={confirmation.paymentMethodName} /><Summary label="Amount" value={`PKR ${confirmation.amount.toLocaleString()}`} accent /></div><div className="mt-5 border-t border-white/[0.07] pt-5"><span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300">Payment pending</span></div></div><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/client/dashboard" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white">Back to dashboard</Link><Link to="/client/memberships" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold transition-colors hover:bg-red-500">View memberships</Link></div></section></PageShell>;
    }

    return (
        <PageShell user={user}>
            <Link to="/client/memberships/review" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to review</Link>
            <section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Membership checkout · Payment</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Choose how to pay.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Select a payment method for your membership request.</p></section>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
                <section><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">Payment methods</p><h2 className="mt-1 text-xl font-bold">Available options</h2></div><p className="hidden text-xs text-neutral-600 sm:block">Click selected option to clear</p></div><div className="space-y-3">{paymentMethods.map((item, index) => <div key={item.id} style={{ animationDelay: `${80 + index * 55}ms` }}><MethodCard method={item} selected={methodId === item.id} onSelect={() => setMethodId((current) => current === item.id ? null : item.id)} /></div>)}</div><div className="dashboard-rise mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 text-emerald-400" style={{ animationDelay: "300ms" }}><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-relaxed text-emerald-400/75">This phase only records your preferred method. CueConnect does not collect card numbers, wallet PINs, or charge money on this screen.</p></div></section>
                <aside className="dashboard-rise h-fit rounded-3xl border border-white/[0.09] bg-neutral-950/95 p-6 sm:p-7 lg:sticky lg:top-8" style={{ animationDelay: "120ms" }}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Final summary</p><h2 className="mt-1 text-xl font-bold">{membership.plan} membership</h2><p className="mt-1 text-xs text-neutral-600">{membership.plan === "Platinum" ? "All branches" : branch.name.replace("GOODSHOT ", "")}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-400"><Icon name="crown" /></span></div><div className="mt-7 space-y-4 text-sm"><div className="flex justify-between gap-4 text-neutral-500"><span>Membership</span><span className="font-semibold text-neutral-300">PKR {membership.price.toLocaleString()}</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Processing fee</span><span className="font-semibold text-emerald-400">PKR 0</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Payment method</span><span className="max-w-[160px] truncate text-right font-semibold text-neutral-300">{method?.name || "Not selected"}</span></div></div><div className="my-6 border-t border-dashed border-white/[0.1]" /><div className="flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Total payable</p><p className="mt-1 text-xs text-neutral-600">{membership.duration}</p></div><p className="text-2xl font-black text-red-400">PKR {membership.price.toLocaleString()}</p></div>{error && <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}<button type="button" onClick={confirmPaymentMethod} disabled={!method} className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">Confirm payment method<Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button><p className="mt-4 text-center text-[10px] leading-relaxed text-neutral-700">Confirmation creates a payment-pending request only.</p></aside>
            </div>
        </PageShell>
    );
}

function PageShell({ user, children }) {
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">{children}</main></div>;
}

function Summary({ label, value, accent = false }) {
    return <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-1.5 truncate text-xs font-bold ${accent ? "text-red-400" : "text-neutral-300"}`} title={value}>{value}</p></div>;
}
