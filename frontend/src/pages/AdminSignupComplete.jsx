import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { registerAdmin, clearError } from "../store/authSlice";
import api from "../services/api";
import Logo from "../components/Logo";

export default function AdminSignupComplete() {
    const [form, setForm] = useState({
        firstName: "",
        lastName: ""
    });
    const [branchAction, setBranchAction] = useState(""); // "create" | "join"
    const [branchName, setBranchName] = useState("");
    const [selectedBranchCode, setSelectedBranchCode] = useState("");
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [success, setSuccess] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error, tempToken } = useSelector((state) => state.auth);

    // redirect if no tempToken (user hasn't completed step 1)
    useEffect(() => {
        if (!tempToken) navigate("/admin/register", { replace: true });
    }, [tempToken, navigate]);

    // clear redux errors on unmount
    useEffect(() => {
        return () => dispatch(clearError());
    }, [dispatch]);

    // fetch branches when "join" is selected
    useEffect(() => {
        if (branchAction === "join") {
            setLoadingBranches(true);
            api.get("/auth/branches")
                .then(({ data }) => setBranches(data.branches || []))
                .catch(() => setBranches([]))
                .finally(() => setLoadingBranches(false));
        }
    }, [branchAction]);

    const update = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const formValid =
        form.firstName.trim() !== "" &&
        form.lastName.trim() !== "" &&
        branchAction !== "" &&
        (branchAction === "create" ? branchName.trim() !== "" : selectedBranchCode !== "");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formValid) return;

        try {
            await dispatch(registerAdmin({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                tempToken,
                branchAction,
                branchName: branchAction === "create" ? branchName.trim() : undefined,
                branchCode: branchAction === "join" ? selectedBranchCode : undefined
            })).unwrap();
            setSuccess(true);
            setTimeout(() => navigate("/admin/login", { state: { accountCreated: true } }), 2000);
        } catch {
            // Redux displays the API error in the form.
        }
    };

    const inputClass = "w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300";

    // don't render until tempToken is confirmed
    if (!tempToken) return null;

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

                {/* step indicator */}
                <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Verified</span>
                    </div>
                    <div className="w-8 h-px bg-white/10" />
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-600 border border-red-500 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white">2</span>
                        </div>
                        <span className="text-[11px] text-gray-300 uppercase tracking-wider font-semibold">Profile</span>
                    </div>
                </div>

                {/* card */}
                <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-red-900/10 px-7 py-6 sm:px-9 sm:py-7">
                    {/* header */}
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-red-600/10 border border-red-500/20 mb-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                            Complete Your Profile
                        </h1>
                        <p className="text-gray-300 text-sm mt-1">
                            Final step — set your name and branch
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* success message */}
                        {success && (
                            <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center flex items-center justify-center gap-2" role="status">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Account created! Redirecting to login…
                            </div>
                        )}

                        {/* server error */}
                        {error && !success && (
                            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center" role="alert">
                                {error}
                            </div>
                        )}

                        {/* first + last name */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label htmlFor="admin-first-name" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">First Name</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0" />
                                        </svg>
                                    </span>
                                    <input id="admin-first-name" type="text" autoComplete="given-name" required value={form.firstName} onChange={update("firstName")} placeholder="First name" className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="admin-last-name" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Last Name</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0" />
                                        </svg>
                                    </span>
                                    <input id="admin-last-name" type="text" autoComplete="family-name" required value={form.lastName} onChange={update("lastName")} placeholder="Last name" className={inputClass} />
                                </div>
                            </div>
                        </div>

                        {/* branch action selector */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">Branch</label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* create new */}
                                <button
                                    type="button"
                                    onClick={() => { setBranchAction("create"); setSelectedBranchCode(""); }}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                                        branchAction === "create"
                                            ? "bg-red-600/10 border-red-500/40 shadow-lg shadow-red-900/10"
                                            : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12]"
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                                        branchAction === "create" ? "bg-red-600/20" : "bg-white/[0.04] group-hover:bg-white/[0.06]"
                                    }`}>
                                        <svg className={`w-5 h-5 transition-colors duration-300 ${branchAction === "create" ? "text-red-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-semibold transition-colors duration-300 ${branchAction === "create" ? "text-red-400" : "text-gray-400"}`}>
                                        Create New
                                    </span>
                                    {branchAction === "create" && (
                                        <div className="absolute top-2 right-2">
                                            <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </button>

                                {/* join existing */}
                                <button
                                    type="button"
                                    onClick={() => { setBranchAction("join"); setBranchName(""); }}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                                        branchAction === "join"
                                            ? "bg-red-600/10 border-red-500/40 shadow-lg shadow-red-900/10"
                                            : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12]"
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                                        branchAction === "join" ? "bg-red-600/20" : "bg-white/[0.04] group-hover:bg-white/[0.06]"
                                    }`}>
                                        <svg className={`w-5 h-5 transition-colors duration-300 ${branchAction === "join" ? "text-red-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                        </svg>
                                    </div>
                                    <span className={`text-xs font-semibold transition-colors duration-300 ${branchAction === "join" ? "text-red-400" : "text-gray-400"}`}>
                                        Join Existing
                                    </span>
                                    {branchAction === "join" && (
                                        <div className="absolute top-2 right-2">
                                            <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* create new branch — name input */}
                        {branchAction === "create" && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <label htmlFor="branch-name" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Branch Name</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                        </svg>
                                    </span>
                                    <input
                                        id="branch-name"
                                        type="text"
                                        required
                                        value={branchName}
                                        onChange={(e) => setBranchName(e.target.value)}
                                        placeholder="e.g. Downtown Club"
                                        className={inputClass}
                                    />
                                </div>
                                <p className="text-gray-500 text-[11px] mt-1.5">A unique branch code will be generated automatically</p>
                            </div>
                        )}

                        {/* join existing branch — dropdown */}
                        {branchAction === "join" && (
                            <div className="animate-[fadeIn_0.3s_ease-out]">
                                <label htmlFor="branch-select" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Select Branch</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                                        </svg>
                                    </span>
                                    <select
                                        id="branch-select"
                                        value={selectedBranchCode}
                                        onChange={(e) => setSelectedBranchCode(e.target.value)}
                                        disabled={loadingBranches}
                                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300 appearance-none cursor-pointer disabled:opacity-50"
                                    >
                                        <option value="" disabled className="bg-neutral-900 text-gray-400">
                                            {loadingBranches ? "Loading branches…" : "Choose a branch"}
                                        </option>
                                        {branches.map((b) => (
                                            <option key={b._id} value={b.branchCode} className="bg-neutral-900 text-white">
                                                {b.branchName} ({b.branchCode})
                                            </option>
                                        ))}
                                    </select>
                                    {/* dropdown chevron */}
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden="true">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </span>
                                </div>
                                {!loadingBranches && branches.length === 0 && (
                                    <p className="text-amber-400/80 text-[11px] mt-1.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                        </svg>
                                        No branches found. Try creating a new one instead.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* submit */}
                        <button
                            type="submit"
                            disabled={!formValid || isLoading || success}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/25 hover:shadow-red-500/35 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating account…
                                </>
                            ) : (
                                "Complete Registration"
                            )}
                        </button>
                    </form>

                    {/* back link */}
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
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        Back to website
                    </Link>
                </div>
            </div>
        </div>
    );
}
