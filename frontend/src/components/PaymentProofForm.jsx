import { useEffect, useMemo, useState } from "react";
import { MAX_PROOF_SIZE, PROOF_TYPES, TRANSACTION_ID, paymentMethodLabels } from "../utils/payments";

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        check: <path d="m5 12 4 4L19 6" />,
        wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" /><path d="M16 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></>,
        upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
        copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

// pick the branch account paid to, enter the receipt's transaction ID, and attach a screenshot
export default function PaymentProofForm({ amount, label = "Payment", unavailableText, accounts, accountId, onAccountChange, transactionId, onTransactionIdChange, proofFile, onProofChange }) {
    const transactionValid = TRANSACTION_ID.test(transactionId.trim());
    const [proofError, setProofError] = useState("");
    const [copiedId, setCopiedId] = useState(null);
    const proofUrl = useMemo(() => proofFile && URL.createObjectURL(proofFile), [proofFile]);

    useEffect(() => () => proofUrl && URL.revokeObjectURL(proofUrl), [proofUrl]);

    const chooseProof = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!PROOF_TYPES.includes(file.type)) return setProofError("Upload a JPG, PNG, or WEBP screenshot.");
        if (file.size > MAX_PROOF_SIZE) return setProofError("The screenshot must be 5 MB or smaller.");
        setProofError("");
        onProofChange(file);
    };

    const removeProof = () => onProofChange(null);

    const copyNumber = async (account) => {
        try {
            await navigator.clipboard.writeText(account.accountNumber);
            setCopiedId(account.id);
            setTimeout(() => setCopiedId((current) => current === account.id ? null : current), 1500);
        } catch {
            // Copying is a convenience; the number stays visible.
        }
    };

    if (!accounts.length) {
        return <article className="rounded-3xl border border-amber-500/15 bg-amber-500/[0.04] p-5 sm:p-6" role="alert"><div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400"><Icon name="wallet" className="h-4 w-4" /></span><div><h2 className="text-sm font-bold">Online payment unavailable</h2><p className="mt-2 text-xs leading-relaxed text-neutral-500">{unavailableText}</p></div></div></article>;
    }

    return (
        <article className="rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name="wallet" className="h-4 w-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-600">{label}</p><h2 className="mt-1 text-base font-bold">Send PKR {amount.toLocaleString()} to the club</h2><p className="mt-1 text-xs leading-relaxed text-neutral-500">Pay from your wallet or bank app, then add the receipt details below.</p></div></div>

            <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-neutral-600">1 · Account you paid to</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {accounts.map((item) => {
                    const selected = item.id === accountId;
                    return (
                        <div key={item.id} className={`relative rounded-2xl border p-4 transition-all ${selected ? "border-red-500/60 bg-red-500/[0.09]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"}`}>
                            <button type="button" onClick={() => onAccountChange(selected ? null : item.id)} aria-pressed={selected} className="block w-full pr-10 text-left"><span className="flex items-center gap-2"><span className="text-sm font-bold text-neutral-100">{paymentMethodLabels[item.method] || item.method}</span>{item.provider && <span className="truncate text-[10px] text-neutral-600">{item.provider}</span>}</span><span className="mt-2 block text-base font-black tracking-wider text-neutral-200">{item.accountNumber}</span><span className="mt-1 block truncate text-[11px] text-neutral-500">{item.accountTitle}</span></button>
                            <button type="button" onClick={() => copyNumber(item)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.07] text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-white" aria-label={`Copy ${item.accountNumber}`}>{copiedId === item.id ? <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" /> : <Icon name="copy" className="h-3.5 w-3.5" />}</button>
                        </div>
                    );
                })}
            </div>

            <label className="mt-6 block"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">2 · Transaction ID</span><input value={transactionId} onChange={(event) => onTransactionIdChange(event.target.value)} maxLength={40} placeholder="e.g. 0123456789" className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/50 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-700 outline-none transition-colors focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10" /></label>
            {transactionId.trim() && !transactionValid && <p className="mt-2 text-[11px] text-red-400">Use 4–40 letters, numbers, or dashes as shown on your receipt.</p>}

            <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-neutral-600">3 · Payment screenshot</p>
            {proofFile && proofUrl ? (
                <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3"><img src={proofUrl} alt="Payment proof preview" className="h-20 w-20 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-neutral-300">{proofFile.name}</p><p className="mt-1 text-[10px] text-neutral-600">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button type="button" onClick={removeProof} className="rounded-lg border border-white/[0.08] px-3 py-2 text-[11px] font-bold text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white">Remove</button></div>
            ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-4 py-8 text-center transition-colors hover:border-red-500/30 hover:bg-red-500/[0.03]"><Icon name="upload" className="h-6 w-6 text-neutral-500" /><span className="text-xs font-bold text-neutral-300">Upload screenshot</span><span className="text-[10px] text-neutral-600">JPG, PNG, or WEBP · up to 5 MB</span><input type="file" accept={PROOF_TYPES.join(",")} onChange={chooseProof} className="sr-only" /></label>
            )}
            {proofError && <p className="mt-2 text-[11px] text-red-400" role="alert">{proofError}</p>}
        </article>
    );
}
