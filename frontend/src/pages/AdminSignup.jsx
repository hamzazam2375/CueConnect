import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { verifyAdminKey, clearError } from "../store/authSlice";
import Logo from "../components/Logo";

export default function AdminSignup() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        secretKey: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error, tempToken } = useSelector((state) => state.auth);

    const update = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const passwordsMatch =
        form.confirmPassword === "" || form.password === form.confirmPassword;

    // when step 1 succeeds, navigate to step 2
    useEffect(() => {
        if (tempToken) navigate("/admin/register/complete");
    }, [tempToken, navigate]);

    // clear errors on unmount
    useEffect(() => {
        return () => dispatch(clearError());
    }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!passwordsMatch) return;
        dispatch(verifyAdminKey({
            email: form.email,
            password: form.password,
            secretKey: form.secretKey
        }));
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 py-6 relative overflow-hidden">
            {/* animated background accents */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-red-800/10 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px]" />
            </div>

            {/* subtle grid pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                aria-hidden="true"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                    backgroundSize: "60px 60px"
                }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* logo */}
                <div className="flex justify-center mb-5">
                    <Link to="/">
                        <Logo blend={false} className="h-8 sm:h-10 contrast-125 brightness-110" />
                    </Link>
                </div>

                {/* card */}
                <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-red-900/10 px-7 py-6 sm:px-9 sm:py-7">
                    {/* header */}
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 mb-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                            Admin Registration
                        </h1>
                        <p className="text-gray-300 text-sm mt-1">
                            Create an admin account with your secret key
                        </p>
                    </div>

                    {/* form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* error message */}
                        {error && (
                            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}
                        {/* email */}
                        <div>
                            <label htmlFor="admin-signup-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </span>
                                <input
                                    id="admin-signup-email"
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={update("email")}
                                    placeholder="admin@goodshot.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* password + confirm — side by side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* password */}
                            <div>
                                <label htmlFor="admin-signup-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </span>
                                    <input
                                        id="admin-signup-password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={6}
                                        value={form.password}
                                        onChange={update("password")}
                                        placeholder="Min 6 chars"
                                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* confirm password */}
                            <div>
                                <label htmlFor="admin-signup-confirm" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                    Confirm
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </span>
                                    <input
                                        id="admin-signup-confirm"
                                        type="password"
                                        required
                                        value={form.confirmPassword}
                                        onChange={update("confirmPassword")}
                                        placeholder="Re-enter"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 transition-all duration-300 ${
                                            passwordsMatch
                                                ? "border-white/[0.08] focus:border-red-500/50 focus:ring-red-500/30 focus:bg-white/[0.06]"
                                                : "border-red-500/60 focus:border-red-500 focus:ring-red-500/40 bg-red-500/[0.04]"
                                        }`}
                                    />
                                </div>
                                {!passwordsMatch && (
                                    <p className="text-red-400 text-[11px] mt-1">Passwords don&apos;t match</p>
                                )}
                            </div>
                        </div>

                        {/* admin secret key */}
                        <div>
                            <label htmlFor="admin-signup-secret" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                                Admin Secret Key
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                    </svg>
                                </span>
                                <input
                                    id="admin-signup-secret"
                                    type={showSecret ? "text" : "password"}
                                    required
                                    value={form.secretKey}
                                    onChange={update("secretKey")}
                                    placeholder="Enter the secret key"
                                    className="w-full pl-10 pr-12 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                                >
                                    {showSecret ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-gray-500 text-[11px] mt-1.5">
                                Contact the owner if you don&apos;t have the secret key
                            </p>
                        </div>

                        {/* submit */}
                        <button
                            type="submit"
                            disabled={!passwordsMatch || isLoading}
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
                                "Create Admin Account"
                            )}
                        </button>
                    </form>

                    {/* divider + already have account */}
                    <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
                        <Link
                            to="/admin/login"
                            className="text-gray-400 text-xs hover:text-red-400 transition-colors duration-200"
                        >
                            Already have an account?{" "}
                            <span className="text-gray-300 font-semibold hover:text-red-400">
                                Sign in
                            </span>
                        </Link>
                    </div>
                </div>

                {/* back to home */}
                <div className="text-center mt-4">
                    <Link
                        to="/"
                        className="text-gray-400 text-xs hover:text-gray-300 transition-colors duration-200 inline-flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Back to website
                    </Link>
                </div>
            </div>
        </div>
    );
}
