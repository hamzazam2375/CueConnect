import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";

const BOOKING_BRANCH_KEY = "cueconnect_booking_branch";
const BOOKING_TABLE_KEY = "cueconnect_booking_table";
const SCHEDULE_KEYS = ["cueconnect_booking_date", "cueconnect_booking_time", "cueconnect_booking_duration"];

const clearScheduleSelection = () => {
    SCHEDULE_KEYS.forEach((key) => sessionStorage.removeItem(key));
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        arrowLeft: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
        arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        table: <><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M7 17v3M17 17v3M8 9h.01M16 13h.01" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        coin: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.4-1.7-.7-3-.7-1.7 0-3 .8-3 2s1.1 1.8 3 2.2 3 1 3 2.2-1.3 2-3 2c-1.3 0-2.4-.3-3.2-.8M12 6v12" /></>,
        lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
        tool: <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 8.3-8.3a4 4 0 0 0 5-5L18 9l-2.4-2.4z" /></>,
        shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></>
    };

    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

const statusStyles = {
    available: {
        label: "Available",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        dot: "bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.7)]"
    },
    occupied: {
        label: "In use",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        dot: "bg-amber-400"
    },
    maintenance: {
        label: "Maintenance",
        badge: "border-neutral-600/30 bg-neutral-700/20 text-neutral-500",
        dot: "bg-neutral-600"
    }
};

function TableCard({ table, index, selected, onSelect }) {
    const status = statusStyles[table.status];
    const isAvailable = table.status === "available";

    return (
        <button
            type="button"
            onClick={() => isAvailable && onSelect(index)}
            disabled={!isAvailable}
            className={`dashboard-rise dashboard-card group relative overflow-hidden rounded-3xl border p-5 text-left transition-all sm:p-6 ${
                selected
                    ? "border-red-500/70 bg-gradient-to-br from-red-950/50 to-neutral-950 shadow-[0_20px_70px_rgba(127,29,29,0.18)]"
                    : isAvailable
                        ? "border-white/[0.08] bg-neutral-950/80 hover:border-white/15"
                        : "cursor-not-allowed border-white/[0.05] bg-neutral-950/45 opacity-60"
            }`}
            style={{ animationDelay: `${120 + index * 55}ms` }}
            aria-pressed={selected}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-xl border ${selected ? "border-red-500/25 bg-red-500/15 text-red-400" : "border-white/[0.07] bg-white/[0.035] text-neutral-500"}`}>
                    <Icon name="table" />
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${status.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} /> {status.label}
                </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-white">{table.name}</h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">{table.type}</p>
                </div>
                {selected && <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white"><Icon name="check" className="h-4 w-4" /></span>}
                {!isAvailable && <Icon name={table.status === "maintenance" ? "tool" : "lock"} className="h-5 w-5 text-neutral-700" />}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-4">
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Hourly</p><p className="mt-1 text-sm font-bold text-neutral-300">PKR {table.pricePerHour}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Per frame</p><p className="mt-1 text-sm font-bold text-neutral-300">PKR {table.frameRate}</p></div>
            </div>
        </button>
    );
}

export default function ClientTableSelection() {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const branchId = sessionStorage.getItem(BOOKING_BRANCH_KEY);
    const branch = branches.find((item) => item.id === branchId);
    const storedTable = sessionStorage.getItem(BOOKING_TABLE_KEY);
    const [selectedTableIndex, setSelectedTableIndex] = useState(() => {
        if (storedTable === null) return null;
        const index = Number(storedTable);
        return Number.isInteger(index) && index >= 0 && branch?.tables[index]?.status === "available" ? index : null;
    });

    if (!branch) {
        return <Navigate to="/client/book" replace />;
    }

    const selectedTable = selectedTableIndex === null ? null : branch.tables[selectedTableIndex];

    const selectTable = (index) => {
        if (selectedTableIndex === index) {
            setSelectedTableIndex(null);
            sessionStorage.removeItem(BOOKING_TABLE_KEY);
            clearScheduleSelection();
            return;
        }

        setSelectedTableIndex(index);
        sessionStorage.setItem(BOOKING_TABLE_KEY, String(index));
        clearScheduleSelection();
    };

    const continueBooking = () => {
        if (!selectedTable) return;
        sessionStorage.setItem(BOOKING_TABLE_KEY, String(selectedTableIndex));
        navigate("/client/book/schedule");
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" />
                <div className="absolute bottom-[-18rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" />
            </div>

            <header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7">
                    <Link to="/" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div>
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">
                <Link to="/client/book" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-white">
                    <Icon name="arrowLeft" className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Change branch
                </Link>

                <section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">New booking · {branch.code}</p>
                        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Pick your table.</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">Choose from the tables currently available at {branch.name.replace("GOODSHOT ", "")}.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-neutral-500"><Icon name="pin" className="h-4 w-4 text-red-500" /> {branch.name.replace("GOODSHOT ", "")}</div>
                </section>

                <ol className="dashboard-rise mt-8 flex max-w-2xl items-center" style={{ animationDelay: "70ms" }} aria-label="Booking progress">
                    {["Branch", "Table", "Schedule", "Confirm"].map((step, index) => (
                        <li key={step} className={`flex items-center ${index < 3 ? "flex-1" : ""}`}>
                            <div className="flex flex-col items-center gap-2">
                                <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${index < 1 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : index === 1 ? "border-red-500 bg-red-600 text-white shadow-lg shadow-red-950" : "border-white/10 bg-neutral-950 text-neutral-600"}`}>{index < 1 ? <Icon name="check" className="h-4 w-4" /> : index + 1}</span>
                                <span className={`text-[10px] font-semibold ${index === 1 ? "text-white" : index < 1 ? "text-emerald-500" : "text-neutral-600"}`}>{step}</span>
                            </div>
                            {index < 3 && <span className={`mx-2 mb-5 h-px flex-1 sm:mx-4 ${index < 1 ? "bg-emerald-500/25" : "bg-white/[0.08]"}`} />}
                        </li>
                    ))}
                </ol>

                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> In use</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-neutral-600" /> Maintenance</span>
                </div>

                <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={`Tables at ${branch.name}`}>
                    {branch.tables.map((table, index) => <TableCard key={`${branch.id}-${table.name}`} table={table} index={index} selected={selectedTableIndex === index} onSelect={selectTable} />)}
                </section>

                <section className="dashboard-rise mt-6 rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-5 backdrop-blur sm:p-6" style={{ animationDelay: "480ms" }}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selectedTable ? "bg-red-500/10 text-red-400" : "bg-white/[0.04] text-neutral-600"}`}><Icon name={selectedTable ? "check" : "table"} /></span>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Selected table</p>
                                <p className="mt-1 text-sm font-bold text-neutral-200">{selectedTable ? `${selectedTable.name} · PKR ${selectedTable.pricePerHour}/hour` : "Choose an available table"}</p>
                            </div>
                        </div>
                        <button type="button" onClick={continueBooking} disabled={!selectedTable} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600 disabled:shadow-none">
                            Continue <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </section>

                <p className="mt-6 text-center text-[11px] text-neutral-700">Click the selected table again to clear it. Occupied and maintenance tables cannot be selected.</p>
            </main>
        </div>
    );
}
