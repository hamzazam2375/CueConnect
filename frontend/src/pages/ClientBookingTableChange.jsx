import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useParams } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";
import { changeClientBookingTable, getBookingsForUser } from "../utils/clientBookings";

const HOURS = {
    "iqbal-town": { open: 720, close: 1560 },
    "link-road": { open: 780, close: 1620 }
};

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        back: <path d="M19 12H5m6 6-6-6 6-6" />,
        check: <path d="m5 12 4 4L19 6" />,
        table: <><rect x="3" y="5" width="18" height="12" rx="3" /><path d="M7 17v3m10-3v3M8 9h.01M16 13h.01" /></>,
        lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
        tool: <path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 8.3-8.3a4 4 0 0 0 5-5L18 9l-2.4-2.4z" />,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2" /><path d="M17 21v-8H7v8M7 3v5h8" /></>
    };
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const parseDate = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const formatTime = (minutes) => {
    const normalized = minutes % 1440;
    const hour = Math.floor(normalized / 60);
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;
};

const mockBusy = (date, slotIndex, tableIndex) => (date.getDate() + slotIndex * 2 + tableIndex * 3) % 9 === 0;

function TableOption({ table, index, duration, isCurrent, selected, scheduleFits, onSelect }) {
    const generallyAvailable = table.status === "available";
    const selectable = generallyAvailable && scheduleFits;
    const status = isCurrent
        ? "Current table"
        : !generallyAvailable
        ? table.status === "maintenance" ? "Maintenance" : "In use"
        : !scheduleFits ? "Schedule conflict" : "Available";
    const statusClass = isCurrent
        ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
        : selectable
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        : "border-neutral-600/30 bg-neutral-700/20 text-neutral-500";

    return (
        <button type="button" disabled={!selectable} onClick={() => selectable && onSelect(index)} className={`dashboard-rise dashboard-card relative rounded-3xl border p-5 text-left sm:p-6 ${selected ? "border-red-500/70 bg-gradient-to-br from-red-950/50 to-neutral-950 shadow-[0_20px_70px_rgba(127,29,29,0.18)]" : selectable ? "border-white/[0.08] bg-neutral-950/80 hover:border-white/15" : "cursor-not-allowed border-white/[0.05] bg-neutral-950/45 opacity-60"}`} style={{ animationDelay: `${90 + index * 55}ms` }}>
            <div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl border ${selected ? "border-red-500/25 bg-red-500/15 text-red-400" : "border-white/[0.07] bg-white/[0.035] text-neutral-500"}`}><Icon name="table" /></span><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>{status}</span></div>
            <div className="mt-5 flex items-end justify-between"><div><h2 className="text-xl font-black">{table.name}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">{table.type}</p></div>{selected ? <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600"><Icon name="check" className="h-4 w-4" /></span> : !selectable && <Icon name={table.status === "maintenance" ? "tool" : "lock"} className="h-5 w-5 text-neutral-700" />}</div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-4"><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">Hourly</p><p className="mt-1 text-sm font-bold text-neutral-300">PKR {table.pricePerHour}</p></div><div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">New total</p><p className="mt-1 text-sm font-bold text-red-400">PKR {(table.pricePerHour * duration).toLocaleString()}</p></div></div>
        </button>
    );
}

export default function ClientBookingTableChange() {
    const { reference } = useParams();
    const { user } = useSelector((state) => state.auth);
    const booking = getBookingsForUser(user).find((item) => item.reference === reference);
    const branch = branches.find((item) => item.id === booking?.branchId);
    const hours = HOURS[booking?.branchId];
    const bookingDate = booking?.date ? parseDate(booking.date) : null;
    const [selectedIndex, setSelectedIndex] = useState(booking?.tableIndex ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedBooking, setSavedBooking] = useState(null);
    const [error, setError] = useState("");

    if (!booking || booking.status !== "pending" || !branch || !hours || !bookingDate) {
        return <Navigate to="/client/bookings" replace />;
    }

    const scheduleFitsTable = (tableIndex) => {
        const startIndex = (booking.startTime - hours.open) / 60;
        if (!Number.isInteger(startIndex) || booking.endTime > hours.close) return false;
        return Array.from({ length: booking.duration }, (_, offset) => startIndex + offset).every((index) => !mockBusy(bookingDate, index, tableIndex));
    };
    const selectedTable = branch.tables[selectedIndex];
    const selectionChanged = selectedIndex !== booking.tableIndex;
    const newTotal = selectedTable ? selectedTable.pricePerHour * booking.duration : booking.total;

    const saveTable = () => {
        if (isSaving || !selectionChanged || !selectedTable || selectedTable.status !== "available" || !scheduleFitsTable(selectedIndex)) return;
        setIsSaving(true);
        setError("");
        try {
            const updated = changeClientBookingTable(booking.reference, {
                tableIndex: selectedIndex,
                tableName: selectedTable.name,
                tableType: selectedTable.type,
                hourlyRate: selectedTable.pricePerHour
            });
            setSavedBooking(updated);
        } catch (saveError) {
            setError(saveError.message || "Table could not be changed.");
            setIsSaving(false);
        }
    };

    if (savedBooking) {
        return <PageShell user={user}><section className="dashboard-rise mx-auto max-w-xl py-12 text-center sm:py-20"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><Icon name="check" className="h-9 w-9" /></span><p className="mt-7 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Table updated</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Your table was changed.</h1><p className="mt-3 text-sm text-neutral-500">{savedBooking.reference} remains pending for club approval.</p><div className="mt-7 grid grid-cols-2 gap-4 rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-5 text-left"><Summary label="New table" value={savedBooking.tableName} /><Summary label="New total" value={`PKR ${savedBooking.total.toLocaleString()}`} accent /></div><Link to="/client/bookings" className="mt-6 inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-bold hover:bg-red-500">View my bookings</Link></section></PageShell>;
    }

    return (
        <PageShell user={user}>
            <Link to="/client/bookings" className="group inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-white"><Icon name="back" className="h-4 w-4 group-hover:-translate-x-1" /> Back to my bookings</Link>
            <section className="dashboard-rise mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">Change table · {booking.reference}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Choose another table.</h1><p className="mt-3 text-sm text-neutral-500 sm:text-base">Your branch and schedule will remain unchanged.</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs text-neutral-400"><strong className="text-white">{branch.name.replace("GOODSHOT ", "")}</strong><span className="mx-2 text-neutral-700">·</span>{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</div></section>

            <div className="mt-8 flex flex-wrap gap-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-600"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Current</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-neutral-600" /> Unavailable</span></div>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{branch.tables.map((table, index) => <TableOption key={`${branch.id}-${table.name}`} table={table} index={index} duration={booking.duration} isCurrent={index === booking.tableIndex} selected={index === selectedIndex} scheduleFits={scheduleFitsTable(index)} onSelect={(value) => { setSelectedIndex(value); setError(""); }} />)}</section>

            <section className="dashboard-rise mt-6 rounded-3xl border border-white/[0.08] bg-neutral-950/90 p-5 sm:p-6" style={{ animationDelay: "440ms" }}><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4"><Summary label="Current table" value={booking.tableName} /><Summary label="Selected table" value={selectedTable?.name || "—"} /><Summary label="Duration" value={`${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`} /><Summary label="New total" value={`PKR ${newTotal.toLocaleString()}`} accent /></div><button type="button" onClick={saveTable} disabled={isSaving || !selectionChanged || !selectedTable || !scheduleFitsTable(selectedIndex)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"><Icon name="save" className="h-4 w-4" />{isSaving ? "Saving..." : "Save table"}</button></div>{error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">{error}</p>}</section>
            <p className="mt-6 text-center text-[11px] text-neutral-700">Only the table and recalculated price will change.</p>
        </PageShell>
    );
}

function PageShell({ user, children }) {
    return <div className="dashboard-shell min-h-screen bg-[#050505] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true"><div className="absolute left-1/3 top-[-16rem] h-[36rem] w-[36rem] rounded-full bg-red-700/[0.09] blur-[150px]" /></div><header className="relative z-20 border-b border-white/[0.07] bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-7"><Link to="/"><Logo blend={false} className="h-7 contrast-125 brightness-110 sm:h-8" /></Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-semibold text-neutral-300">{user.firstName} {user.lastName}</p><p className="text-[10px] text-neutral-600">Client account</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-xs font-black">{`${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase()}</div></div></div></header><main className="relative z-10 mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10">{children}</main></div>;
}

function Summary({ label, value, accent = false }) {
    return <div><p className="text-[9px] font-bold uppercase tracking-wider text-neutral-700">{label}</p><p className={`mt-1.5 text-sm font-bold ${accent ? "text-red-400" : "text-neutral-300"}`}>{value}</p></div>;
}
