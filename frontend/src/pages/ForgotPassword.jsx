import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Logo from "../components/Logo";
import { ADMIN_PASSWORD_RULES, PASSWORD_RULES } from "../utils/passwordPolicy";

const inputClass = "w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300";
const buttonClass = "w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/25 transition-all duration-300";
const labelClass = "block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5";

const apiError = (error, fallback) => error.response?.data?.message || fallback;

// Two steps: ask for the account email, then the emailed 6-digit code and a new password.
// `role` is "client" or "admin"; it picks the account type, password rules, and where to sign in.
export default function ForgotPassword({ role = "client" }) {
    const navigate = useNavigate();
    const loginPath = role === "admin" ? "/admin/login" : "/login";
    const rules = role === "admin" ? ADMIN_PASSWORD_RULES : PASSWORD_RULES;

    const [step, setStep] = useState("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [wait, setWait] = useState(0);
    const codeRef = useRef(null);

    const checks = rules.map((rule) => ({ label: rule.label, met: rule.test(newPassword) }));
    const passwordStrong = checks.every((check) => check.met);
    const passwordsMatch = newPassword === confirmPassword;

    useEffect(() => {
        if (wait <= 0) return undefined;
        const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [wait]);

    useEffect(() => {
        if (step === "code") codeRef.current?.focus();
    }, [step]);

    const requestCode = async () => {
        const { data } = await api.post("/auth/password/forgot", { email: email.trim(), role });
        setWait(data.resendIn || 60);
        return data;
    };

    const submitEmail = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError("");
        try {
            const data = await requestCode();
            setInfo(data.message);
            setStep("code");
        } catch (requestError) {
            setError(apiError(requestError, "Could not send a reset code. Please try again."));
            // a code went out moments ago: let them enter it instead of waiting
            if (requestError.response?.status === 429) {
                setWait(requestError.response.data?.resendIn || 0);
                setStep("code");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resend = async () => {
        if (wait > 0 || isResending) return;
        setIsResending(true);
        setError("");
        setInfo("");
        try {
            await requestCode();
            setInfo(`A new code is on its way to ${email.trim()}.`);
        } catch (resendError) {
            setError(apiError(resendError, "Could not send a new code. Please try again."));
            setWait(resendError.response?.data?.resendIn || 0);
        } finally {
            setIsResending(false);
        }
    };

    const submitReset = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setError("");
        if (code.length !== 6) return setError("Enter the 6-digit code from your email.");
        if (!passwordStrong) return setError("Your new password doesn't meet all the rules below.");
        if (!passwordsMatch) return setError("Passwords do not match.");

        setIsSubmitting(true);
        try {
            const { data } = await api.post("/auth/password/reset", { email: email.trim(), role, code, newPassword });
            navigate(loginPath, { replace: true, state: { notice: data.message } });
        } catch (resetError) {
            setError(apiError(resetError, "Could not reset your password. Please try again."));
            setCode("");
            codeRef.current?.focus();
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 py-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-red-800/10 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-5">
                    <Link to="/" aria-label="Back to home">
                        <Logo blend={false} className="h-8 sm:h-10 contrast-125 brightness-110" />
                    </Link>
                </div>

                <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-red-900/10 px-7 py-6 sm:px-9 sm:py-7">
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 mb-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">{step === "email" ? "Forgot your password?" : "Choose a new password"}</h1>
                        <p className="text-gray-300 text-sm mt-1">
                            {step === "email"
                                ? `Enter your ${role === "admin" ? "admin " : ""}account email and we'll send you a 6-digit code.`
                                : <>Enter the code we sent to <span className="font-semibold text-white break-all">{email.trim()}</span></>}
                        </p>
                    </div>

                    {info && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center" role="status">{info}</div>}
                    {error && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center" role="alert">{error}</div>}

                    {step === "email" ? (
                        <form onSubmit={submitEmail} className="space-y-4">
                            <div>
                                <label htmlFor="reset-email" className={labelClass}>Email Address</label>
                                <input id="reset-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={inputClass} />
                            </div>
                            <button type="submit" disabled={isSubmitting || !email.trim()} className={buttonClass}>
                                {isSubmitting ? "Sending code..." : "Send reset code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={submitReset} className="space-y-4">
                            <div>
                                <label htmlFor="reset-code" className={labelClass}>Reset code</label>
                                <input ref={codeRef} id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className={`${inputClass} text-center text-2xl font-bold tracking-[0.6em] placeholder:text-gray-700`} />
                                <p className="text-[11px] text-gray-500 mt-1.5">The code expires in 10 minutes. Check your spam folder if you can&apos;t find it.</p>
                            </div>

                            <div>
                                <label htmlFor="reset-new-password" className={labelClass}>New password</label>
                                <div className="relative">
                                    <input id="reset-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Create a new password" className={`${inputClass} pr-16`} />
                                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-500 hover:text-gray-300">{showPassword ? "Hide" : "Show"}</button>
                                </div>
                                <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Password rules">
                                    {checks.map((check) => (
                                        <li key={check.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${check.met ? "text-emerald-400" : "text-gray-500"}`}>
                                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d={check.met ? "M4.5 12.75l6 6 9-13.5" : "M6 12h12"} />
                                            </svg>
                                            {check.label}
                                            <span className="sr-only">{check.met ? "(done)" : "(missing)"}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <label htmlFor="reset-confirm-password" className={labelClass}>Confirm new password</label>
                                <input id="reset-confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Type it again" className={inputClass} />
                                {confirmPassword && !passwordsMatch && <p className="text-[11px] text-red-400 mt-1.5">Passwords do not match.</p>}
                            </div>

                            <button type="submit" disabled={isSubmitting || code.length !== 6 || !passwordStrong || !passwordsMatch} className={buttonClass}>
                                {isSubmitting ? "Saving..." : "Reset password"}
                            </button>

                            <div className="flex items-center justify-between text-xs">
                                <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); setInfo(""); }} className="text-gray-400 hover:text-white transition-colors">Use a different email</button>
                                <button type="button" onClick={resend} disabled={wait > 0 || isResending} className="font-semibold text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors">
                                    {isResending ? "Sending..." : wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
                        <Link to={loginPath} className="text-gray-400 text-xs hover:text-red-400 transition-colors duration-200">
                            Remembered it? <span className="text-gray-300 font-semibold hover:text-red-400">Back to sign in</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
