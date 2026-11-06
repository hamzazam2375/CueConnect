import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import SidebarToggle from "../components/SidebarToggle";
import NotificationBell from "../components/NotificationBell";
import { ErrorPanel, LoadingPanel } from "../components/LoadState";
import PaymentProofForm from "../components/PaymentProofForm";
import { getApiError } from "../utils/clientBookings";
import { clearSelection, createClientMembership, fetchMembershipPlans, loadSelection } from "../utils/clientMemberships";
import { TRANSACTION_ID, paymentMethodLabels } from "../utils/payments";

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function ClientMembershipPayment() {
    const { user } = useSelector((state) => state.auth);
    const [branches, setBranches] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const [accountId, setAccountId] = useState(null);
    const [transactionId, setTransactionId] = useState("");
    const [proofFile, setProofFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmation, setConfirmation] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        fetchMembershipPlans()
            .then((data) => active && setBranches(data))
            .catch((loadFailure) => active && setLoadError(getApiError(loadFailure, "Payment details could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [reloadCount]);

    if (confirmation) return <Confirmation membership={confirmation} user={user} />;

    if (!branches) {
        const retryLoad = () => {
            setLoadError("");
            setReloadCount((count) => count + 1);
        };
        return <PageShell user={user}>{loadError ? <ErrorPanel message={loadError} onRetry={retryLoad} /> : <LoadingPanel label="Loading payment" />}</PageShell>;
    }

    const selection = loadSelection(branches);
    if (!selection?.termsAccepted) return <Navigate to="/client/memberships/review" replace />;

    const { branch, membership } = selection;
    const account = branch.paymentAccounts.find((item) => item.id === accountId);
    const canSubmit = account && TRANSACTION_ID.test(transactionId.trim()) && proofFile && !isSubmitting;

    const submitPayment = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        setError("");
        try {
            const created = await createClientMembership({ branchId: branch.id, plan: membership.plan, paymentAccountId: account.id, transactionId: transactionId.trim(), paymentProof: proofFile });
            clearSelection();
            setConfirmation(created);
        } catch (submitError) {
            setError(getApiError(submitError, "Membership request could not be sent. Please try again."));
            setIsSubmitting(false);
        }
    };

    return (
        <PageShell user={user}>
            <Link to="/client/memberships/review" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to review</Link>
            <section className="dashboard-rise mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Membership checkout · Payment</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Pay and send proof.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Pay the membership price to a club account, then add your receipt details.</p></section>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]">
                <section className="dashboard-rise" style={{ animationDelay: "80ms" }}>
                    <PaymentProofForm amount={membership.price} label="Membership payment" unavailableText="This club has not added a payment account yet, so memberships cannot be paid online. Please contact the club or choose another branch." accounts={branch.paymentAccounts} accountId={accountId} onAccountChange={setAccountId} transactionId={transactionId} onTransactionIdChange={setTransactionId} proofFile={proofFile} onProofChange={setProofFile} />
                </section>
                <aside className="dashboard-rise h-fit rounded-3xl border border-white/[0.09] bg-neutral-950/95 p-6 sm:p-7 lg:sticky lg:top-8" style={{ animationDelay: "120ms" }}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Final summary</p><h2 className="mt-1 text-xl font-bold">{membership.plan} membership</h2><p className="mt-1 text-xs text-neutral-600">{membership.allBranches ? "All branches" : branch.name.replace("GOODSHOT ", "")}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-400"><Icon name="crown" /></span></div><div className="mt-7 space-y-4 text-sm"><div className="flex justify-between gap-4 text-neutral-500"><span>Membership</span><span className="font-semibold text-neutral-300">PKR {membership.price.toLocaleString()}</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Processing fee</span><span className="font-semibold text-emerald-400">PKR 0</span></div><div className="flex justify-between gap-4 text-neutral-500"><span>Paid to</span><span className="max-w-[160px] truncate text-right font-semibold text-neutral-300">{account ? paymentMethodLabels[account.method] || account.method : "Not selected"}</span></div></div><div className="my-6 border-t border-dashed border-white/[0.1]" /><div className="flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Total payable</p><p className="mt-1 text-xs text-neutral-600">{membership.duration}</p></div><p className="text-2xl font-black text-red-400">PKR {membership.price.toLocaleString()}</p></div>{error && <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}<button type="button" onClick={submitPayment} disabled={!canSubmit} className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">{isSubmitting ? "Sending request..." : "Submit payment"}<Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button><p className="mt-4 text-center text-[10px] leading-relaxed text-neutral-700">The club activates your membership after verifying the payment.</p></aside>
            </div>
        </PageShell>
    );
}

function Confirmation({ membership, user }) {
    return <PageShell user={user}><section className="dashboard-rise mx-auto max-w-2xl py-10 text-center sm:py-16"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span><p className="mt-7 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Payment submitted</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Membership request sent.</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-neutral-500">The club will verify your payment and activate your {membership.plan} membership. You can follow its status in My membership.</p><div className="mt-7 rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6 text-left"><div className="grid grid-cols-2 gap-5 sm:grid-cols-4"><Summary label="Reference" value={membership.reference} /><Summary label="Plan" value={membership.plan} /><Summary label="Transaction ID" value={membership.transactionId} /><Summary label="Amount" value={`PKR ${membership.price.toLocaleString()}`} accent /></div><div className="mt-5 border-t border-white/[0.07] pt-5"><span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300">Awaiting verification</span></div></div><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/client/dashboard" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white">Back to dashboard</Link><Link to="/client/memberships/manage" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold transition-colors hover:bg-red-500">View my membership</Link></div></section></PageShell>;
}

function PageShell({ user, children }) {
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><div className="flex items-center gap-3"><SidebarToggle /><NotificationBell /><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">{children}</main></div>;
}

function Summary({ label, value, accent = false }) {
    return <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-1.5 truncate text-xs font-bold ${accent ? "text-red-400" : "text-neutral-300"}`} title={value}>{value}</p></div>;
}
