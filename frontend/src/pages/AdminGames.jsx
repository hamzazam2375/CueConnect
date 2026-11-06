import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import StartGameModal, { PersonFields, ModalShell, inputClass, labelClass } from "../components/StartGameModal";
import api from "../services/api";

const emptyStop = { payerMode: "same", payerUserId: "", payerName: "" };
const emptyFilters = { from: "", to: "", tableId: "", customerId: "", type: "", paymentStatus: "" };

const formatTime = (value) => new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const formatDateTime = (value) => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const formatDuration = (minutes) => {
    const total = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
};
const liveMinutes = (startTime, nowMs) => Math.max(0, Math.floor((nowMs - new Date(startTime).getTime()) / 60000));

function FilterSelect({ value, onChange, children }) {
    return (
        <div className="relative min-w-0">
            <select value={value} onChange={onChange} className={`${inputClass} appearance-none pr-10`}>
                {children}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300">
                <Icon name="chevronDown" className="h-4 w-4" />
            </span>
        </div>
    );
}

function DateFilter({ value, onChange, label }) {
    const inputRef = useRef(null);

    return (
        <div className="relative min-w-0">
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                aria-label={label}
                className={`${inputClass} admin-date-field pr-10`}
            />
            <button
                type="button"
                onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.focus()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-200 hover:text-white"
                aria-label={`Open ${label} calendar`}
            >
                <Icon name="calendar" className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function AdminGames() {
    const [now, setNow] = useState(Date.now());
    const [activeGames, setActiveGames] = useState([]);
    const [history, setHistory] = useState([]);
    const [tables, setTables] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filters, setFilters] = useState(emptyFilters);

    const [startOpen, setStartOpen] = useState(false);
    const [startPrefill, setStartPrefill] = useState({});

    const [stopTarget, setStopTarget] = useState(null);
    const [stopForm, setStopForm] = useState(emptyStop);
    const [isStopping, setIsStopping] = useState(false);
    const [restartAfterStop, setRestartAfterStop] = useState(false);

    const [detail, setDetail] = useState(null);

    const registeredCustomers = customers.filter((customer) => customer.isActive !== false);

    const groupedHistory = useMemo(() => {
        const groups = new Map();
        history.forEach((game) => {
            const key = game.table?.name || "Unknown table";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(game);
        });
        return [...groups.entries()];
    }, [history]);

    const loadCore = async () => {
        const [{ data: tableData }, { data: customerData }, { data: activeData }] = await Promise.all([
            api.get("/admin/tables"),
            api.get("/admin/customers"),
            api.get("/admin/games/active")
        ]);
        setTables(tableData.tables || []);
        setCustomers(customerData.customers || []);
        setActiveGames(activeData.games || []);
    };

    const loadHistory = async (nextFilters = filters) => {
        const { data } = await api.get("/admin/games/history", { params: Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value)) });
        setHistory(data.games || []);
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadCore(), loadHistory()]);
        } catch {
            setError("Games could not be loaded. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!success) return undefined;
        const timer = setTimeout(() => setSuccess(null), 3000);
        return () => clearTimeout(timer);
    }, [success]);

    const openStart = (prefill = {}) => {
        setStartPrefill(prefill);
        setStartOpen(true);
        setError(null);
    };

    const openStop = (game, restart = false) => {
        setStopTarget(game);
        setRestartAfterStop(restart);
        setStopForm({
            payerMode: game.customer ? "same" : "walkin",
            payerUserId: game.customer?.id || "",
            payerName: game.playerName || ""
        });
        setError(null);
    };

    const submitStop = async () => {
        if (!stopTarget) return;
        setIsStopping(true);
        setError(null);
        try {
            const payerMode = stopForm.payerMode;
            const sameCustomer = payerMode === "same" && stopTarget.customer?.id;
            await api.patch(`/admin/games/${stopTarget.id}/stop`, {
                payerUserId: payerMode === "registered" ? stopForm.payerUserId : sameCustomer || undefined,
                payerName: payerMode === "walkin" || (payerMode === "same" && !stopTarget.customer)
                    ? (payerMode === "same" ? stopTarget.playerName : stopForm.payerName.trim())
                    : undefined
            });
            const prefill = restartAfterStop ? {
                playerMode: stopTarget.customer ? "registered" : "walkin",
                playerUserId: stopTarget.customer?.id || "",
                playerName: stopTarget.playerName || "",
                tableId: stopTarget.table?.id || "",
                type: stopTarget.type,
                frameType: stopTarget.frameType || "single"
            } : null;
            setSuccess("Game stopped and added to the payer's bill");
            setStopTarget(null);
            await Promise.all([loadCore(), loadHistory()]);
            if (prefill) openStart(prefill);
        } catch (err) {
            setError(err.response?.data?.message || "Game could not be stopped");
        } finally {
            setIsStopping(false);
        }
    };

    const applyFilters = async (event) => {
        event.preventDefault();
        try {
            await loadHistory();
        } catch {
            setError("History could not be filtered");
        }
    };

    return (
        <AdminLayout title="Games">
            <StartGameModal
                open={startOpen}
                onClose={() => setStartOpen(false)}
                prefill={startPrefill}
                onStarted={async () => {
                    setSuccess("Game started");
                    await loadCore();
                }}
            />

            {stopTarget && (
                <ModalShell title={restartAfterStop ? "Stop & start next game" : "Stop game"} onClose={() => setStopTarget(null)}>
                    <p className="mb-4 text-sm text-neutral-400">{stopTarget.playerName} on {stopTarget.table?.name} · {stopTarget.type === "century" ? "Century" : `Frame (${stopTarget.frameType})`}</p>
                    <form onSubmit={(e) => { e.preventDefault(); submitStop(); }} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {["same", "registered", "walkin"].map((value) => (
                                <button key={value} type="button" onClick={() => setStopForm((f) => ({ ...f, payerMode: value }))} className={`rounded-xl border px-2 py-2 text-[10px] font-bold uppercase tracking-wider ${stopForm.payerMode === value ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/[0.08] text-neutral-500"}`}>
                                    {value === "same" ? "Player pays" : value === "registered" ? "Other customer" : "Walk-in payer"}
                                </button>
                            ))}
                        </div>
                        {stopForm.payerMode === "same" && <p className="text-xs text-neutral-500">Charges go to {stopTarget.playerName}{stopTarget.customerId ? ` (${stopTarget.customerId})` : ""}.</p>}
                        {stopForm.payerMode === "registered" && (
                            <PersonFields
                                customers={registeredCustomers}
                                mode="registered"
                                onMode={() => {}}
                                userId={stopForm.payerUserId}
                                onUserId={(payerUserId) => setStopForm((f) => ({ ...f, payerUserId }))}
                                name=""
                                onName={() => {}}
                                label="Payer"
                            />
                        )}
                        {stopForm.payerMode === "walkin" && (
                            <div>
                                <label className={labelClass}>Payer name</label>
                                <input value={stopForm.payerName} onChange={(e) => setStopForm((f) => ({ ...f, payerName: e.target.value }))} className={inputClass} placeholder="Who is paying?" />
                            </div>
                        )}
                        <p className="text-xs text-neutral-600">End time, duration, and charges are calculated on the server. Multiple games for the same payer share one pending bill.</p>
                        {error && stopTarget && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setStopTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-semibold text-neutral-300">Cancel</button>
                            <button type="submit" disabled={isStopping} className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{isStopping ? "Stopping..." : "Stop game"}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {detail && (
                <ModalShell title="Game details" onClose={() => setDetail(null)}>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-[10px] uppercase text-neutral-600">Player</p><p className="mt-1 font-bold">{detail.playerName}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Customer ID</p><p className="mt-1 font-bold">{detail.customerId || "Walk-in"}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Payer</p><p className="mt-1 font-bold">{detail.payerName}{detail.payerCustomerId ? ` (${detail.payerCustomerId})` : ""}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Table</p><p className="mt-1 font-bold">{detail.table?.name}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Type</p><p className="mt-1 font-bold capitalize">{detail.type}{detail.frameType ? ` · ${detail.frameType}` : ""}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Duration</p><p className="mt-1 font-bold">{formatDuration(detail.duration)}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">Start</p><p className="mt-1 font-bold">{formatDateTime(detail.startTime)}</p></div>
                        <div><p className="text-[10px] uppercase text-neutral-600">End</p><p className="mt-1 font-bold">{detail.endTime ? formatDateTime(detail.endTime) : "—"}</p></div>
                    </dl>
                    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Billing</p>
                        <div className="mt-3 flex items-end justify-between">
                            <div>
                                <p className="text-xs text-neutral-500">Game charge</p>
                                <p className="text-2xl font-black text-white">Rs. {Number(detail.finalAmount || 0).toLocaleString()}</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${detail.paymentStatus === "paid" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}>{detail.paymentStatus || "pending"}</span>
                        </div>
                        {detail.bill && <p className="mt-3 text-xs text-neutral-500">Bill total Rs. {Number(detail.bill.totalAmount).toLocaleString()} · {detail.bill.gameCount} game{detail.bill.gameCount === 1 ? "" : "s"}</p>}
                    </div>
                </ModalShell>
            )}

            {success && <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{success}</div>}
            {error && !startOpen && !stopTarget && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        <Icon name="gamepad" className="h-3.5 w-3.5" /> Games
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Live play</h1>
                    <p className="mt-2 text-sm text-neutral-500">Start, stop, and bill games. Billing stays on a separate pending bill per payer.</p>
                </div>
                <button type="button" onClick={() => openStart()} className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">
                    <Icon name="plus" className="h-4 w-4" /> Start Game
                </button>
            </section>

            {loading ? (
                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-48 rounded-2xl border border-white/[0.07] bg-neutral-950/80 animate-pulse" />)}</section>
            ) : activeGames.length === 0 ? (
                <section className="mt-6 rounded-3xl border border-dashed border-white/[0.1] bg-neutral-950/60 px-6 py-14 text-center">
                    <p className="font-bold">No active games</p>
                    <p className="mt-1 text-sm text-neutral-600">Start a frame or century game on an available table.</p>
                </section>
            ) : (
                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {activeGames.map((game) => (
                        <article key={game.id} className="dashboard-card rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">{game.table?.name}</p>
                                    <h2 className="mt-1 text-lg font-black">{game.playerName}</h2>
                                    <p className="text-xs text-neutral-500">{game.customerId || "Walk-in"} · {game.type === "century" ? "Century" : `Frame · ${game.frameType}`}</p>
                                </div>
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400">Live</span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div><p className="text-neutral-600">Started</p><p className="font-bold">{formatTime(game.startTime)}</p></div>
                                <div><p className="text-neutral-600">Duration</p><p className="font-bold">{formatDuration(liveMinutes(game.startTime, now))}</p></div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button type="button" onClick={() => openStop(game, false)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold hover:bg-red-500">Stop</button>
                                <button type="button" onClick={() => openStop(game, true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] text-white hover:bg-white/[0.07]" aria-label="Start another game"><Icon name="plus" className="h-4 w-4" /></button>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            <section className="mt-12">
                <h2 className="text-2xl font-black">Game history</h2>
                <p className="mt-1 text-sm text-neutral-500">Completed games grouped by table.</p>
                <form onSubmit={applyFilters} className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
                    <div className="w-[10.5rem] shrink-0"><DateFilter label="Start date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} /></div>
                    <div className="w-[10.5rem] shrink-0"><DateFilter label="End date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} /></div>
                    <div className="min-w-[8.5rem] flex-1"><FilterSelect value={filters.tableId} onChange={(e) => setFilters((f) => ({ ...f, tableId: e.target.value }))}>
                        <option value="" className="bg-neutral-900">All tables</option>
                        {tables.map((table) => <option key={table._id} value={table._id} className="bg-neutral-900">{table.name}</option>)}
                    </FilterSelect></div>
                    <div className="min-w-[9rem] flex-1"><FilterSelect value={filters.customerId} onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value }))}>
                        <option value="" className="bg-neutral-900">All customers</option>
                        {customers.map((customer) => <option key={customer.id} value={customer.id} className="bg-neutral-900">{customer.name}</option>)}
                    </FilterSelect></div>
                    <div className="min-w-[7.5rem] flex-1"><FilterSelect value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                        <option value="" className="bg-neutral-900">All types</option>
                        <option value="frame" className="bg-neutral-900">Frame</option>
                        <option value="century" className="bg-neutral-900">Century</option>
                    </FilterSelect></div>
                    <div className="min-w-[8.5rem] flex-1"><FilterSelect value={filters.paymentStatus} onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}>
                        <option value="" className="bg-neutral-900">All payments</option>
                        <option value="pending" className="bg-neutral-900">Pending</option>
                        <option value="paid" className="bg-neutral-900">Paid</option>
                    </FilterSelect></div>
                    <button type="submit" className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition-colors hover:bg-red-500">
                        Filter
                    </button>
                </form>

                {groupedHistory.length === 0 ? (
                    <p className="mt-8 text-sm text-neutral-600">No completed games match these filters.</p>
                ) : groupedHistory.map(([tableName, games]) => (
                    <div key={tableName} className="mt-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">{tableName}</h3>
                        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.07]">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">Payer</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Time</th>
                                        <th className="px-4 py-3">Duration</th>
                                        <th className="px-4 py-3">Charge</th>
                                        <th className="px-4 py-3">Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {games.map((game) => (
                                        <tr key={game.id} onClick={() => setDetail(game)} className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.03]">
                                            <td className="px-4 py-3"><p className="font-semibold">{game.playerName}</p><p className="text-[11px] text-neutral-600">{game.customerId || "Walk-in"}</p></td>
                                            <td className="px-4 py-3">{game.payerName}</td>
                                            <td className="px-4 py-3 capitalize">{game.type}{game.frameType ? ` · ${game.frameType}` : ""}</td>
                                            <td className="px-4 py-3 text-neutral-400">{formatDateTime(game.startTime)} – {game.endTime ? formatTime(game.endTime) : ""}</td>
                                            <td className="px-4 py-3">{formatDuration(game.duration)}</td>
                                            <td className="px-4 py-3 font-bold">Rs. {Number(game.finalAmount || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${game.paymentStatus === "paid" ? "border-emerald-500/20 text-emerald-400" : "border-amber-500/20 text-amber-400"}`}>{game.paymentStatus}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </section>
        </AdminLayout>
    );
}
