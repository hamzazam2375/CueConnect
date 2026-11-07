import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { verifyClientEmail } from "../store/authSlice";

// Asks for the 6-digit code emailed to `email`. On success the client is signed in
// (the auth slice gets the user), so the page's own redirect takes over.
export default function EmailCodeStep({ email, notice, emailSent = true, resendIn = 60, onBack }) {
    const dispatch = useDispatch();
    const inputRef = useRef(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState(emailSent ? "" : notice);
    const [info, setInfo] = useState(emailSent ? notice : "");
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [wait, setWait] = useState(resendIn);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (wait <= 0) return undefined;
        const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [wait]);

    const submit = async (event) => {
        event.preventDefault();
        if (code.length !== 6 || isVerifying) return;
        setIsVerifying(true);
        setError("");
        try {
            await dispatch(verifyClientEmail({ email, code })).unwrap();
        } catch (verifyError) {
            setError(verifyError);
            setCode("");
            setIsVerifying(false);
            inputRef.current?.focus();
        }
    };

    const resend = async () => {
        if (wait > 0 || isResending) return;
        setIsResending(true);
        setError("");
        setInfo("");
        try {
            const { data } = await api.post("/auth/client/resend-code", { email });
            setInfo(`A new code is on its way to ${email}.`);
            setWait(data.resendIn || 60);
        } catch (resendError) {
            setError(resendError.response?.data?.message || "Could not send a new code. Please try again.");
            setWait(resendError.response?.data?.resendIn || 0);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div>
            <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 mb-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                </div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Check your email</h1>
                <p className="text-gray-300 text-sm mt-1">Enter the 6-digit code we sent to <span className="font-semibold text-white break-all">{email}</span></p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                {info && <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center" role="status">{info}</div>}
                {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center" role="alert">{error}</div>}

                <div>
                    <label htmlFor="email-code" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Verification code</label>
                    <input
                        ref={inputRef}
                        id="email-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        className="w-full py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-center text-2xl font-bold tracking-[0.6em] text-white placeholder:text-gray-700 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300"
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5">The code expires in 10 minutes. Check your spam folder if you can&apos;t find it.</p>
                </div>

                <button type="submit" disabled={code.length !== 6 || isVerifying} className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/25 transition-all duration-300">
                    {isVerifying ? "Verifying..." : "Verify & continue"}
                </button>

                <div className="flex items-center justify-between text-xs">
                    <button type="button" onClick={onBack} className="text-gray-400 hover:text-white transition-colors">Use a different email</button>
                    <button type="button" onClick={resend} disabled={wait > 0 || isResending} className="font-semibold text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors">
                        {isResending ? "Sending..." : wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                    </button>
                </div>
            </form>
        </div>
    );
}
