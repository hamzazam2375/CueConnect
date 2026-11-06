import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ErrorPanel, LoadingPanel } from "../components/LoadState";
import PaymentProofForm from "../components/PaymentProofForm";
import { EventsShell, Icon, TypeBadge } from "./ClientEvents";
import { getApiError } from "../utils/clientBookings";
import { fetchClientEvent, formatEventDate, formatEventTime, formatFee, registerForEvent } from "../utils/clientEvents";
import { TRANSACTION_ID } from "../utils/payments";

function Detail({ icon, label, value }) {
    return <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name={icon} /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">{label}</p><p className="mt-1 text-sm font-bold text-neutral-100">{value}</p></div></div>;
}

function Notice({ title, text }) {
    return <section className="dashboard-rise mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/80 px-6 py-12 text-center"><h2 className="text-xl font-black">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{text}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/client/events?tab=mine" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">My registrations</Link><Link to="/client/events" className="rounded-xl border border-white/[0.09] px-5 py-3 text-sm font-bold text-neutral-300 hover:bg-white/[0.05]">All events</Link></div></section>;
}

export default function ClientEventRegister() {
    const { user } = useSelector((state) => state.auth);
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [reloadCount, setReloadCount] = useState(0);
    const [accountId, setAccountId] = useState(null);
    const [transactionId, setTransactionId] = useState("");
    const [proofFile, setProofFile] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [registration, setRegistration] = useState(null);

    useEffect(() => {
        let active = true;
        fetchClientEvent(eventId)
            .then((data) => active && setEvent(data))
            .catch((fetchError) => active && setLoadError(fetchError.response?.status === 404 ? "This event could not be found. It may have been removed." : getApiError(fetchError, "Event details could not be loaded. Please try again.")));
        return () => { active = false; };
    }, [eventId, reloadCount]);

    const back = <Link to="/client/events" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> All events</Link>;

    if (registration) return <EventsShell user={user}><RegistrationSuccess registration={registration} /></EventsShell>;
    if (loadError) return <EventsShell user={user}>{back}<ErrorPanel message={loadError} onRetry={() => { setLoadError(""); setReloadCount((count) => count + 1); }} /></EventsShell>;
    if (!event) return <EventsShell user={user}><LoadingPanel label="Loading event" /></EventsShell>;

    const paid = event.price > 0;
    const account = event.paymentAccounts.find((item) => item.id === accountId);
    const paymentReady = !paid || (account && TRANSACTION_ID.test(transactionId.trim()) && proofFile);
    const canSubmit = event.registrationOpen && accepted && paymentReady && !isSubmitting;
    const existing = event.registration && ["registered", "confirmed"].includes(event.registration.status);

    const submit = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        setSaveError("");
        try {
            setRegistration(await registerForEvent(event.id, paid ? { paymentAccountId: account.id, transactionId: transactionId.trim(), paymentProof: proofFile } : {}));
        } catch (submitError) {
            setSaveError(getApiError(submitError, "Registration could not be sent. Please try again."));
            setIsSubmitting(false);
        }
    };

    return (
        <EventsShell user={user}>
            {back}
            <section className="dashboard-rise mt-7"><TypeBadge type={event.type} /><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{event.title}</h1>{event.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">{event.description}</p>}</section>

            {existing ? <Notice title={event.registration.status === "confirmed" ? "You're registered" : "Registration sent"} text={event.registration.status === "confirmed" ? `Your spot is confirmed. Reference ${event.registration.reference}.` : `The club is verifying your payment. Reference ${event.registration.reference}.`} />
                : !event.registrationOpen ? <Notice title={event.spotsLeft === 0 ? "This event is fully booked" : "Registration is closed"} text="Keep an eye on the events page for the next one." />
                    : (
                        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                            <section className="dashboard-rise space-y-4" style={{ animationDelay: "120ms" }}>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Detail icon="pin" label="Branch" value={event.branchName.replace("GOODSHOT ", "")} />
                                    <Detail icon="calendar" label="Date" value={formatEventDate(event.date, { weekday: "long", month: "long", day: "numeric" })} />
                                    <Detail icon="clock" label="Starts" value={formatEventTime(event.date)} />
                                    <Detail icon="users" label="Spots" value={event.spotsLeft === null ? "Open entry" : `${event.spotsLeft} of ${event.maxParticipants} left`} />
                                    {event.prize && <Detail icon="medal" label="Prize" value={event.prize} />}
                                </div>
                                {paid && <PaymentProofForm amount={event.price} label="Entry fee" unavailableText="This club has not added a payment account yet, so the entry fee cannot be paid online. Please contact the club." accounts={event.paymentAccounts} accountId={accountId} onAccountChange={setAccountId} transactionId={transactionId} onTransactionIdChange={setTransactionId} proofFile={proofFile} onProofChange={setProofFile} />}
                                <article className="rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 text-xs leading-relaxed text-neutral-500 sm:p-6"><h2 className="text-sm font-bold text-white">Event rules</h2><ul className="mt-3 space-y-2"><li>· Please arrive 15 minutes before the start to check in.</li>{paid && <li>· Your spot is held while the club verifies your payment. Unverifiable payments are rejected.</li>}<li>· You can cancel from My registrations until the event starts.</li><li>· The club's decisions on the format and results are final.</li></ul></article>
                            </section>

                            <aside className="dashboard-rise h-fit rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6 lg:sticky lg:top-6" style={{ animationDelay: "200ms" }}>
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">Summary</p><h2 className="mt-0.5 text-lg font-bold">Entry fee</h2>
                                <div className="mt-5 space-y-3 border-b border-white/[0.07] pb-5 text-sm"><div className="flex justify-between text-neutral-500"><span>Standard entry</span><span>{formatFee(event.registrationFee)}</span></div>{event.isMember && event.price < event.registrationFee && <div className="flex justify-between text-neutral-500"><span>{event.memberPlan} member price</span><span className="text-emerald-400">− PKR {(event.registrationFee - event.price).toLocaleString()}</span></div>}{!event.isMember && event.memberFee !== null && event.memberFee < event.registrationFee && <p className="text-[11px] text-neutral-600">Members pay {formatFee(event.memberFee)}. <Link to="/client/memberships" className="font-semibold text-red-400 hover:text-red-300">See plans</Link></p>}</div>
                                <div className="flex items-end justify-between py-5"><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">{paid ? "Pay now" : "Total"}</p><p className="text-2xl font-black text-red-400">{formatFee(event.price)}</p></div>
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5"><input type="checkbox" checked={accepted} onChange={(changeEvent) => setAccepted(changeEvent.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" /><span className="text-[11px] leading-relaxed text-neutral-500">I have read the event details and agree to the rules.</span></label>
                                {saveError && <p className="mt-3 text-xs text-red-400" role="alert">{saveError}</p>}
                                <button type="button" onClick={submit} disabled={!canSubmit} className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">{isSubmitting ? "Sending..." : paid ? "Register & send payment" : "Confirm registration"} <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
                                {paid && !paymentReady && <p className="mt-3 text-center text-[10px] leading-relaxed text-neutral-700">Select an account, enter the transaction ID, and upload proof to continue.</p>}
                            </aside>
                        </div>
                    )}
        </EventsShell>
    );
}

function RegistrationSuccess({ registration }) {
    const { event } = registration;
    const confirmed = registration.status === "confirmed";
    return (
        <section className="dashboard-rise mx-auto max-w-2xl py-8 text-center sm:py-16">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span>
            <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">{confirmed ? "Spot confirmed" : "Registration received"}</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">{confirmed ? "You're in!" : "Registration sent."}</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-500">{confirmed ? `See you at ${event.title}.` : `Your spot is held while the club verifies your ${formatFee(registration.feePaid)} payment. You'll get a notification once it's confirmed.`}</p>
            <div className="mx-auto mt-8 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-6 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600">Registration reference</p><p className="mt-2 break-all text-2xl font-black tracking-wider text-red-400">{registration.reference}</p><div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-5 text-sm"><div><p className="text-[9px] uppercase text-neutral-700">Event</p><p className="mt-1 font-bold text-neutral-300">{event.title}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Club</p><p className="mt-1 font-bold text-neutral-300">{event.branchName.replace("GOODSHOT ", "")}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Date</p><p className="mt-1 font-bold text-neutral-300">{formatEventDate(event.date, { month: "short", day: "numeric", year: "numeric" })}</p></div><div><p className="text-[9px] uppercase text-neutral-700">Starts</p><p className="mt-1 font-bold text-neutral-300">{formatEventTime(event.date)}</p></div></div></div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/client/events?tab=mine" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold transition-colors hover:bg-red-500">My registrations</Link><Link to="/client/events" className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-6 py-3 text-sm font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white">More events</Link></div>
        </section>
    );
}
