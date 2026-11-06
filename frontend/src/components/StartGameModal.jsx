import { useEffect, useMemo, useState } from "react";
import { Icon } from "./AdminLayout";
import api from "../services/api";

export const inputClass = "admin-filter-field w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300";
export const labelClass = "block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5";
const emptyStart = { playerMode: "registered", playerUserId: "", playerName: "", tableId: "", type: "frame", frameType: "single" };

export function ModalShell({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-950 border border-white/[0.08] rounded-2xl shadow-2xl shadow-red-900/10 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white p-1" aria-label="Close"><Icon name="x" className="h-5 w-5" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function PersonFields({ customers, mode, onMode, userId, onUserId, name, onName, label }) {
    const selected = customers.find((customer) => customer.id === userId);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                {["registered", "walkin"].map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onMode(value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${mode === value ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/[0.08] text-neutral-500 hover:text-white"}`}
                    >
                        {value === "registered" ? "Registered" : "Walk-in Customer"}
                    </button>
                ))}
            </div>
            {mode === "registered" ? (
                <>
                    <div>
                        <label className={labelClass}>{label}</label>
                        <select value={userId} onChange={(e) => onUserId(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                            <option value="" className="bg-neutral-900">Select customer</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id} className="bg-neutral-900">{customer.name} · {customer.customerId}</option>
                            ))}
                        </select>
                    </div>
                    {selected && <p className="text-xs text-neutral-500">Customer ID: <span className="font-bold text-neutral-300">{selected.customerId}</span></p>}
                </>
            ) : (
                <div>
                    <label className={labelClass}>{label} name</label>
                    <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Enter name" className={inputClass} />
                </div>
            )}
        </div>
    );
}

export default function StartGameModal({ open, onClose, onStarted, prefill = {} }) {
    const [tables, setTables] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeGames, setActiveGames] = useState([]);
    const [form, setForm] = useState(emptyStart);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const occupiedTableIds = useMemo(() => new Set(activeGames.map((game) => game.table?.id)), [activeGames]);
    const availableTables = tables.filter((table) => table.status !== "maintenance" && (form.tableId === table._id || !occupiedTableIds.has(table._id)));
    const registeredCustomers = customers.filter((customer) => customer.isActive !== false);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setForm({ ...emptyStart, ...prefill });
        setError(null);

        Promise.all([
            api.get("/admin/tables"),
            api.get("/admin/customers"),
            api.get("/admin/games/active")
        ]).then(([{ data: tableData }, { data: customerData }, { data: activeData }]) => {
            if (cancelled) return;
            setTables(tableData.tables || []);
            setCustomers(customerData.customers || []);
            setActiveGames(activeData.games || []);
        }).catch(() => {
            if (!cancelled) setError("Could not load tables and customers.");
        });

        return () => { cancelled = true; };
    }, [open]);

    if (!open) return null;

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.post("/admin/games", {
                tableId: form.tableId,
                type: form.type,
                frameType: form.type === "frame" ? form.frameType : undefined,
                playerUserId: form.playerMode === "registered" ? form.playerUserId : undefined,
                playerName: form.playerMode === "walkin" ? form.playerName.trim() : undefined
            });
            onStarted?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Game could not be started");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Start Game" onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
                <PersonFields
                    customers={registeredCustomers}
                    mode={form.playerMode}
                    onMode={(playerMode) => setForm((current) => ({ ...current, playerMode, playerUserId: "", playerName: "" }))}
                    userId={form.playerUserId}
                    onUserId={(playerUserId) => setForm((current) => ({ ...current, playerUserId }))}
                    name={form.playerName}
                    onName={(playerName) => setForm((current) => ({ ...current, playerName }))}
                    label="Player"
                />
                <div>
                    <label className={labelClass}>Table</label>
                    <select required value={form.tableId} onChange={(e) => setForm((current) => ({ ...current, tableId: e.target.value }))} className={`${inputClass} appearance-none cursor-pointer`}>
                        <option value="" className="bg-neutral-900">Select table</option>
                        {availableTables.map((table) => (
                            <option key={table._id} value={table._id} className="bg-neutral-900">{table.name} · {table.tableType}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Game type</label>
                        <select value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))} className={`${inputClass} appearance-none cursor-pointer`}>
                            <option value="frame" className="bg-neutral-900">Frame</option>
                            <option value="century" className="bg-neutral-900">Century</option>
                        </select>
                    </div>
                    {form.type === "frame" && (
                        <div>
                            <label className={labelClass}>Frame type</label>
                            <select value={form.frameType} onChange={(e) => setForm((current) => ({ ...current, frameType: e.target.value }))} className={`${inputClass} appearance-none cursor-pointer`}>
                                <option value="single" className="bg-neutral-900">Single</option>
                                <option value="double" className="bg-neutral-900">Double</option>
                            </select>
                        </div>
                    )}
                </div>
                <p className="text-xs text-neutral-600">Walk-in customers are stored by name only. Registered players are linked by Customer ID.</p>
                {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-semibold text-neutral-300">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Starting..." : "Start game"}</button>
                </div>
            </form>
        </ModalShell>
    );
}
