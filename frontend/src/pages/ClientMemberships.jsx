import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";

const SELECTION_KEY = "cueconnect_membership_selection";

const planStyles = {
    Silver: { accent: "text-neutral-300", badge: "border-neutral-400/20 bg-neutral-400/10 text-neutral-300", glow: "bg-neutral-400/10" },
    Gold: { accent: "text-amber-300", badge: "border-amber-400/20 bg-amber-400/10 text-amber-300", glow: "bg-amber-500/10" },
    Platinum: { accent: "text-red-400", badge: "border-red-500/20 bg-red-500/10 text-red-400", glow: "bg-red-600/10" }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /></>,
        percent: <><path d="m19 5-14 14" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const loadSelection = () => {
    try {
        const selection = JSON.parse(sessionStorage.getItem(SELECTION_KEY));
        const branch = branches.find((item) => item.id === selection?.branchId);
        const planIndex = Number(selection?.planIndex);
        if (branch && Number.isInteger(planIndex) && branch.memberships[planIndex]) return { branchId: branch.id, planIndex };
    } catch {
        // Ignore invalid browser data and start with no selection.
    }
    return null;
};

function PlanCard({ membership, index, selected, onSelect }) {
    const style = planStyles[membership.plan];
    const benefits = membership.rules.split(".").map((item) => item.trim()).filter(Boolean);

    return (
        <button type="button" onClick={() => onSelect(index)} aria-pressed={selected} className={`dashboard-rise dashboard-card group relative overflow-hidden rounded-3xl border p-6 text-left transition-all sm:p-7 ${selected ? "border-red-500/70 bg-gradient-to-br from-red-950/55 to-neutral-950 shadow-[0_24px_80px_rgba(127,29,29,0.2)]" : "border-white/[0.08] bg-neutral-950/85 hover:-translate-y-1 hover:border-white/15"}`} style={{ animationDelay: `${100 + index * 70}ms` }}>
            <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-125 ${style.glow}`} />
            {membership.plan === "Gold" && <span className="absolute right-5 top-5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">Popular</span>}
            <div className={`relative grid h-12 w-12 place-items-center rounded-2xl border ${style.badge}`}><Icon name="crown" /></div>
            <div className="relative mt-6"><p className={`text-[10px] font-black uppercase tracking-[0.22em] ${style.accent}`}>{membership.plan} membership</p><div className="mt-3 flex items-end gap-2"><span className="text-3xl font-black tracking-tight">PKR {membership.price.toLocaleString()}</span><span className="mb-1 text-xs text-neutral-600">/ month</span></div></div>
            <div className="relative mt-6 space-y-3 border-t border-white/[0.07] pt-5">{benefits.map((benefit) => <div key={benefit} className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-400"><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${selected ? "bg-red-600 text-white" : "bg-white/[0.06] text-neutral-500"}`}><Icon name="check" className="h-2.5 w-2.5" /></span>{benefit}</div>)}</div>
            <div className="relative mt-7 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">{membership.duration}</span><span className={`grid h-8 w-8 place-items-center rounded-full transition-all ${selected ? "scale-100 bg-red-600 text-white" : "scale-90 border border-white/10 text-transparent group-hover:text-neutral-600"}`}><Icon name="check" className="h-4 w-4" /></span></div>
        </button>
    );
}

export default function ClientMemberships() {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const storedSelection = loadSelection();
    const [branchId, setBranchId] = useState(storedSelection?.branchId || branches[0].id);
    const [selectedIndex, setSelectedIndex] = useState(storedSelection?.planIndex ?? null);
    const branch = branches.find((item) => item.id === branchId);
    const membership = selectedIndex === null ? null : branch.memberships[selectedIndex];
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();

    const changeBranch = (nextBranchId) => {
        if (nextBranchId === branchId) return;
        setBranchId(nextBranchId);
        setSelectedIndex(null);
        sessionStorage.removeItem(SELECTION_KEY);
    };

    const selectPlan = (index) => {
        if (selectedIndex === index) {
            setSelectedIndex(null);
            sessionStorage.removeItem(SELECTION_KEY);
            return;
        }
        setSelectedIndex(index);
    };

    const continueSelection = () => {
        if (!membership) return;
        sessionStorage.setItem(SELECTION_KEY, JSON.stringify({
            branchId,
            branchName: branch.name,
            planIndex: selectedIndex,
            plan: membership.plan,
            price: membership.price,
            discount: membership.discount,
            duration: membership.duration
        }));
        navigate("/client/memberships/review");
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-18rem] h-[40rem] w-[40rem] rounded-full bg-red-700/[0.09] blur-[160px]" /><div className="absolute bottom-[-18rem] right-[-8rem] h-[36rem] w-[36rem] rounded-full bg-amber-900/[0.06] blur-[150px]" /></div>
            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><Link to="/client/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{initials}</Link></div></div></header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
                <Link to="/client/dashboard" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white"><Icon name="back" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard</Link>
                <section className="dashboard-rise mt-7 text-center"><span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400"><Icon name="crown" className="h-3.5 w-3.5" /> Cue Club memberships</span><h1 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">Play more. Pay less. <span className="text-red-500">Own the table.</span></h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">Compare monthly plans and choose the membership that fits your game.</p></section>

                <section className="dashboard-rise mx-auto mt-9 max-w-xl rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-1.5" style={{ animationDelay: "60ms" }} aria-label="Choose a branch"><div className="grid grid-cols-2 gap-1.5">{branches.map((item) => <button key={item.id} type="button" onClick={() => changeBranch(item.id)} className={`rounded-xl px-4 py-3 text-xs font-bold transition-all ${branchId === item.id ? "bg-red-600 text-white shadow-lg shadow-red-950/40" : "text-neutral-500 hover:bg-white/[0.05] hover:text-white"}`}><span className="inline-flex items-center gap-2"><Icon name="pin" className="h-3.5 w-3.5" />{item.name.replace("GOODSHOT ", "")}</span></button>)}</div></section>

                <div className="mt-8 flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">Compare plans</p><h2 className="mt-1 text-xl font-bold">{branch.name.replace("GOODSHOT ", "")}</h2></div><p className="hidden text-xs text-neutral-600 sm:block">Select a plan · click again to clear</p></div>
                <section className="mt-4 grid gap-4 md:grid-cols-3" aria-label={`Memberships at ${branch.name}`}>{branch.memberships.map((item, index) => <PlanCard key={`${branch.id}-${item.plan}`} membership={item} index={index} selected={selectedIndex === index} onSelect={selectPlan} />)}</section>

                <section className="dashboard-rise mt-6 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6" style={{ animationDelay: "360ms" }}>
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4"><Summary icon="crown" label="Selected plan" value={membership?.plan || "None"} /><Summary icon="pin" label="Branch" value={membership ? branch.name.replace("GOODSHOT ", "") : "—"} /><Summary icon="percent" label="Discount" value={membership ? `${membership.discount}% off` : "—"} /><Summary icon="calendar" label="Monthly price" value={membership ? `PKR ${membership.price.toLocaleString()}` : "—"} accent /></div><button type="button" onClick={continueSelection} disabled={!membership} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">Continue<Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button></div>
                </section>
                <p className="mt-6 text-center text-[11px] text-neutral-700">Selecting a plan does not charge you. Payment and activation will be added separately.</p>
            </main>
        </div>
    );
}

function Summary({ icon, label, value, accent = false }) {
    return <div><div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-700"><Icon name={icon} className="h-3 w-3" />{label}</div><p className={`mt-1.5 truncate text-sm font-bold ${accent ? "text-red-400" : "text-neutral-300"}`}>{value}</p></div>;
}
