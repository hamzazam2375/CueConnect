import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";

const SELECTION_KEY = "cueconnect_membership_selection";
const REVIEW_KEY = "cueconnect_membership_review";

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
        phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>,
        card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const loadMembership = () => {
    try {
        const selection = JSON.parse(sessionStorage.getItem(SELECTION_KEY));
        const branch = branches.find((item) => item.id === selection?.branchId);
        const planIndex = Number(selection?.planIndex);
        const membership = branch?.memberships[planIndex];
        if (branch && Number.isInteger(planIndex) && membership) return { branch, membership, planIndex };
    } catch {
        // Invalid browser data is handled by redirecting to plan selection.
    }
    return null;
};

function Detail({ icon, label, value }) {
    return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-neutral-500"><Icon name={icon} className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className="mt-1 truncate text-sm font-semibold text-neutral-300">{value}</p></div></div>;
}

export default function ClientMembershipReview() {
    const { user } = useSelector((state) => state.auth);
    const selection = loadMembership();
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [reviewComplete, setReviewComplete] = useState(false);

    if (!selection) return <Navigate to="/client/memberships" replace />;

    const { branch, membership, planIndex } = selection;
    const benefits = membership.rules.split(".").map((item) => item.trim()).filter(Boolean);
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();

    const proceedToPayment = () => {
        if (!acceptedTerms || reviewComplete) return;
        sessionStorage.setItem(REVIEW_KEY, JSON.stringify({
            branchId: branch.id,
            planIndex,
            clientId: user.id,
            termsAccepted: true,
            amount: membership.price,
            reviewedAt: new Date().toISOString()
        }));
        setReviewComplete(true);
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /><div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" /></div>
            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
                <Link to="/client/memberships" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Change membership plan</Link>
                <section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Membership checkout · Review</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Review your membership.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Confirm everything below before moving to payment.</p></section>

                {reviewComplete && <section className="dashboard-rise mt-7 flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-5 text-emerald-400" role="status"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/15"><Icon name="check" /></span><div><h2 className="text-sm font-bold">Review complete — ready for payment</h2><p className="mt-1 text-xs leading-relaxed text-emerald-400/70">Your consent and selection are saved for this session. No payment has been taken and the membership is not active yet.</p></div></section>}

                <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
                    <div className="space-y-6">
                        <section className="dashboard-rise dashboard-card overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950/85" style={{ animationDelay: "80ms" }}>
                            <div className="relative border-b border-white/[0.07] p-6 sm:p-7"><div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-red-600/10 blur-3xl" /><div className="relative flex items-start justify-between gap-5"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Selected membership</p><h2 className="mt-2 text-3xl font-black">{membership.plan}</h2><p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-500"><Icon name="pin" className="h-3.5 w-3.5 text-red-500" />{membership.plan === "Platinum" ? "Valid at all branches" : branch.name.replace("GOODSHOT ", "")}</p></div><span className="grid h-14 w-14 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400"><Icon name="crown" className="h-7 w-7" /></span></div></div>
                            <div className="p-6 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Included benefits</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{benefits.map((benefit) => <div key={benefit} className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-400"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-600 text-white"><Icon name="check" className="h-2.5 w-2.5" /></span>{benefit}</div>)}</div></div>
                        </section>

                        <section className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6 sm:p-7" style={{ animationDelay: "140ms" }}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Account details</p><h2 className="mt-1 text-xl font-bold">Membership holder</h2></div><Link to="/client/profile" className="text-xs font-bold text-neutral-500 transition-colors hover:text-red-400">Edit profile</Link></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><Detail icon="user" label="Full name" value={`${user.firstName} ${user.lastName}`} /><Detail icon="mail" label="Email" value={user.email} /><Detail icon="phone" label="Phone" value={user.phone || "Not added"} /><Detail icon="shield" label="Account" value="Verified client" /></div></section>

                        <label className={`dashboard-rise flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${acceptedTerms ? "border-red-500/25 bg-red-500/[0.07]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"}`} style={{ animationDelay: "200ms" }}><input type="checkbox" checked={acceptedTerms} onChange={(event) => { setAcceptedTerms(event.target.checked); setReviewComplete(false); }} className="mt-0.5 h-4 w-4 accent-red-600" /><span className="text-xs leading-relaxed text-neutral-500">I confirm that the details above are correct and agree to the monthly membership terms. Membership benefits begin only after successful payment and activation.</span></label>
                    </div>

                    <aside className="dashboard-rise h-fit rounded-3xl border border-white/[0.09] bg-neutral-950/95 p-6 sm:p-7 lg:sticky lg:top-8" style={{ animationDelay: "120ms" }}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-neutral-400"><Icon name="card" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">Billing summary</p><h2 className="mt-1 text-lg font-bold">Amount due</h2></div></div><div className="mt-7 space-y-4 text-sm"><div className="flex justify-between gap-4 text-neutral-500"><span>{membership.plan} · {membership.duration}</span><span className="font-semibold text-neutral-300">PKR {membership.price.toLocaleString()}</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Processing fee</span><span className="font-semibold text-emerald-400">PKR 0</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Membership discount</span><span className="font-semibold text-neutral-300">{membership.discount}% on play</span></div></div><div className="my-6 border-t border-dashed border-white/[0.1]" /><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Due today</p><p className="mt-1 text-xs text-neutral-600">One month membership</p></div><p className="text-2xl font-black text-red-400">PKR {membership.price.toLocaleString()}</p></div><button type="button" onClick={proceedToPayment} disabled={!acceptedTerms || reviewComplete} className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">{reviewComplete ? "Ready for payment" : "Proceed to payment"}<Icon name={reviewComplete ? "check" : "arrow"} className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button><div className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-neutral-700"><Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0" />You will not be charged during this review step.</div></aside>
                </div>
            </main>
        </div>
    );
}
