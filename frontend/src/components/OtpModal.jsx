import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifyOtp, resendOtp, clearError, closeOtpModal } from "../store/authSlice";

export default function OtpModal() {
    const dispatch = useDispatch();
    const { pendingEmail, isLoading, error, showOtpModal } = useSelector((state) => state.auth);

    const [digits, setDigits] = useState(["", "", "", "", "", ""]);
    const [resendCooldown, setResendCooldown] = useState(30);
    const [shakeError, setShakeError] = useState(false);
    const [successPulse, setSuccessPulse] = useState(false);
    const inputRefs = useRef([]);

    // auto-focus first input when modal appears
    useEffect(() => {
        if (showOtpModal) {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [showOtpModal]);

    // resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // shake on error
    useEffect(() => {
        if (error) {
            setShakeError(true);
            setTimeout(() => setShakeError(false), 500);
        }
    }, [error]);

    const handleChange = (index, value) => {
        // only allow digits
        if (value && !/^\d$/.test(value)) return;

        dispatch(clearError());
        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);

        // auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // auto-submit when all 6 digits filled
        if (value && index === 5 && newDigits.every((d) => d !== "")) {
            const otp = newDigits.join("");
            dispatch(verifyOtp({ email: pendingEmail, otp }));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;

        dispatch(clearError());
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
            newDigits[i] = pasted[i] || "";
        }
        setDigits(newDigits);

        // focus the next empty or the last
        const nextEmpty = newDigits.findIndex((d) => d === "");
        inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

        // auto-submit if all filled
        if (newDigits.every((d) => d !== "")) {
            dispatch(verifyOtp({ email: pendingEmail, otp: newDigits.join("") }));
        }
    };

    const handleResend = () => {
        if (resendCooldown > 0 || isLoading) return;
        dispatch(resendOtp({ email: pendingEmail }));
        setResendCooldown(30);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
    };

    const handleVerify = () => {
        const otp = digits.join("");
        if (otp.length !== 6) return;
        dispatch(verifyOtp({ email: pendingEmail, otp }));
    };

    const handleClose = () => {
        dispatch(closeOtpModal());
        setDigits(["", "", "", "", "", ""]);
    };

    // mask email: show first 3 chars + last part
    const maskEmail = (email) => {
        if (!email) return "";
        const [user, domain] = email.split("@");
        const masked = user.length > 3 ? user.slice(0, 3) + "•••" : user;
        return `${masked}@${domain}`;
    };

    if (!showOtpModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
            {/* backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
                style={{ animation: "otpFadeIn 0.25s ease-out" }}
            />

            {/* modal card */}
            <div
                className={`relative w-full max-w-sm ${shakeError ? "animate-shake" : ""}`}
                style={{ animation: "otpSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
                <div className="bg-neutral-950/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-red-900/20 overflow-hidden">
                    {/* top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

                    {/* close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors z-10"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="px-7 py-6 sm:px-9 sm:py-7">
                        {/* icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </div>
                                {/* pulse ring */}
                                <div className="absolute inset-0 rounded-2xl border border-red-500/20 animate-ping opacity-20" />
                            </div>
                        </div>

                        {/* header text */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-extrabold text-white tracking-tight mb-1">
                                Verify Your Email
                            </h2>
                            <p className="text-gray-400 text-sm">
                                We sent a 6-digit code to
                            </p>
                            <p className="text-gray-200 text-sm font-semibold mt-0.5">
                                {maskEmail(pendingEmail)}
                            </p>
                        </div>

                        {/* error message */}
                        {error && (
                            <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* OTP input boxes */}
                        <div className="flex justify-center gap-2.5 sm:gap-3 mb-6" onPaste={handlePaste}>
                            {digits.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => (inputRefs.current[i] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border bg-white/[0.04] text-white focus:outline-none transition-all duration-300 ${
                                        digit
                                            ? "border-red-500/40 bg-red-500/[0.06] shadow-sm shadow-red-500/10"
                                            : "border-white/[0.08]"
                                    } focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 focus:bg-white/[0.06]`}
                                    autoComplete="one-time-code"
                                    aria-label={`Digit ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* verify button */}
                        <button
                            onClick={handleVerify}
                            disabled={digits.some((d) => d === "") || isLoading}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/25 hover:shadow-red-500/35 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Verifying…
                                </>
                            ) : (
                                "Verify Code"
                            )}
                        </button>

                        {/* resend */}
                        <div className="mt-4 text-center">
                            <p className="text-gray-500 text-xs mb-1">Didn&apos;t receive the code?</p>
                            {resendCooldown > 0 ? (
                                <p className="text-gray-400 text-xs">
                                    Resend in <span className="text-red-400 font-semibold">{resendCooldown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* animations */}
            <style>{`
                @keyframes otpFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes otpSlideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 50%, 90% { transform: translateX(-4px); }
                    30%, 70% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
}
