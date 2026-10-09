import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";

const BOOKING_BRANCH_KEY = "cueconnect_booking_branch";

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        arrowLeft: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
        arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        table: <><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M7 17v3M17 17v3M8 9h.01M16 13h.01" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>
    };

    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

function BranchCard({ branch, selected, onSelect, delay }) {
    const availableCount = branch.tables.filter((table) => table.status === "available").length;

    return (
        <button
            type="button"
            onClick={() => onSelect(branch.id)}
            className={`dashboard-rise dashboard-card group relative w-full overflow-hidden rounded-3xl border p-5 text-left sm:p-6 ${
                selected
                    ? "border-red-500/70 bg-gradient-to-br from-red-950/45 to-neutral-950 shadow-[0_20px_70px_rgba(127,29,29,0.18)]"
                    : "border-white/[0.08] bg-neutral-950/80 hover:border-white/15"
            }`}
            style={{ animationDelay: delay }}
            aria-pressed={selected}
        >
            <span className={`absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-full border transition-all duration-300 ${selected ? "scale-100 border-red-500 bg-red-600 text-white" : "scale-90 border-white/15 bg-white/[0.03] text-transparent group-hover:scale-100"}`}>
                <Icon name="check" className="h-4 w-4" />
            </span>

            <div className="pr-10">
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">{branch.code}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Open now
                    </span>
                </div>
                <h2 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">{branch.name.replace("GOODSHOT ", "")}</h2>
                <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-neutral-500">
                    <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> {branch.address}
                </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5">
                <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400"><Icon name="table" className="h-4 w-4" /></span>
                    <span><span className="block text-sm font-bold text-neutral-200">{availableCount} available</span><span className="block text-[10px] text-neutral-600">of {branch.tables.length} tables</span></span>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] text-neutral-400"><Icon name="clock" className="h-4 w-4" /></span>
                    <span><span className="block text-sm font-bold text-neutral-200">Daily</span><span className="block truncate text-[10px] text-neutral-600">{branch.openingHours.split("(")[0]}</span></span>
                </div>
            </div>
        </button>
    );
}

export default function ClientBooking() {
    const { user } = useSelector((state) => state.auth);
    const [selectedBranchId, setSelectedBranchId] = useState(() => sessionStorage.getItem(BOOKING_BRANCH_KEY) || "");
    const [saved, setSaved] = useState(false);
    const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);

    const selectBranch = (branchId) => {
        setSelectedBranchId(branchId);
        setSaved(false);
    };

    const continueBooking = () => {
        if (!selectedBranch) return;
        sessionStorage.setItem(BOOKING_BRANCH_KEY, selectedBranch.id);
        setSaved(true);
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" />
                <div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" />
            </div>

            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7">
                    <Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 sm:h-8 contrast-125 brightness-110" /></Link>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div>
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
                <Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white">
                    <Icon name="arrowLeft" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard
                </Link>

                <section className="dashboard-rise mt-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">New booking</p>
                    <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Choose your club.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">Select the Goodshot branch where you want to play. You can change this before confirming your booking.</p>
                </section>

                <ol className="dashboard-rise mt-8 flex max-w-2xl items-center" style={{ animationDelay: "80ms" }} aria-label="Booking progress">
                    {["Branch", "Table", "Schedule", "Confirm"].map((step, index) => (
                        <li key={step} className={`flex items-center ${index < 3 ? "flex-1" : ""}`}>
                            <div className="flex flex-col items-center gap-2">
                                <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${index === 0 ? "border-red-500 bg-red-600 text-white shadow-lg shadow-red-950" : "border-white/10 bg-neutral-950 text-neutral-600"}`}>{index + 1}</span>
                                <span className={`text-[10px] font-semibold ${index === 0 ? "text-white" : "text-neutral-600"}`}>{step}</span>
                            </div>
                            {index < 3 && <span className="mx-2 mb-5 h-px flex-1 bg-white/[0.08] sm:mx-4" />}
                        </li>
                    ))}
                </ol>

                <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Available branches">
                    {branches.map((branch, index) => (
                        <BranchCard key={branch.id} branch={branch} selected={selectedBranchId === branch.id} onSelect={selectBranch} delay={`${140 + index * 80}ms`} />
                    ))}
                </section>

                <section className="dashboard-rise mt-6 rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-5 backdrop-blur sm:p-6" style={{ animationDelay: "320ms" }}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selectedBranch ? "bg-red-500/10 text-red-400" : "bg-white/[0.04] text-neutral-600"}`}><Icon name={selectedBranch ? "check" : "pin"} /></span>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Selected branch</p>
                                <p className="mt-1 text-sm font-bold text-neutral-200">{selectedBranch ? selectedBranch.name : "Choose a branch to continue"}</p>
                            </div>
                        </div>
                        <button type="button" onClick={continueBooking} disabled={!selectedBranch} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">
                            Continue <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                    {saved && <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.07] px-4 py-3 text-sm text-emerald-400" role="status"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" /><p><span className="font-bold">Branch saved.</span> Table selection will be added in the next step.</p></div>}
                </section>

                <p className="mt-6 text-center text-[11px] text-neutral-700">Your selection is saved securely for this browser session.</p>
            </main>
        </div>
    );
}
