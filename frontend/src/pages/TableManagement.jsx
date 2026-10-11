import { useState, useEffect } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import api from "../services/api";

const statusColors = {
    available:   { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Available" },
    occupied:    { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   label: "Occupied" },
    maintenance: { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400",     label: "Maintenance" },
};

const emptyForm = { name: "", tableType: "snooker", status: "available", pricePerHour: "", frameRate: "", centuryRate: "" };

// ── modal ──

function TableModal({ open, onClose, onSubmit, form, setForm, isSubmitting, title }) {
    if (!open) return null;

    const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    const inputClass = "w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 focus:bg-white/[0.06] transition-all duration-300";
    const labelClass = "block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-neutral-950 border border-white/[0.08] rounded-2xl shadow-2xl shadow-red-900/10 p-6 sm:p-8 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1" aria-label="Close">
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                    <div>
                        <label htmlFor="table-name" className={labelClass}>Table Name</label>
                        <input id="table-name" type="text" required value={form.name} onChange={update("name")} placeholder="e.g. Table 1" className={inputClass} />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <div>
                            <label htmlFor="table-type" className={labelClass}>Type</label>
                            <select id="table-type" value={form.tableType} onChange={update("tableType")} className={`${inputClass} appearance-none cursor-pointer`}>
                                <option value="snooker" className="bg-neutral-900">Snooker</option>
                                <option value="billiard" className="bg-neutral-900">Billiard</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="table-status" className={labelClass}>Status</label>
                            <select id="table-status" value={form.status} onChange={update("status")} className={`${inputClass} appearance-none cursor-pointer`}>
                                <option value="available" className="bg-neutral-900">Available</option>
                                <option value="occupied" className="bg-neutral-900">Occupied</option>
                                <option value="maintenance" className="bg-neutral-900">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-3">Pricing (Rs.)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="price-hour" className={labelClass}>Per Hour</label>
                                <input id="price-hour" type="number" min="0" required value={form.pricePerHour} onChange={update("pricePerHour")} placeholder="0" className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="price-frame" className={labelClass}>Per Frame</label>
                                <input id="price-frame" type="number" min="0" required value={form.frameRate} onChange={update("frameRate")} placeholder="0" className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="price-century" className={labelClass}>Century</label>
                                <input id="price-century" type="number" min="0" required value={form.centuryRate} onChange={update("centuryRate")} placeholder="0" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-neutral-300 hover:bg-white/[0.07] transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-red-800 disabled:to-red-900 disabled:cursor-not-allowed text-sm font-bold text-white shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2">
                            {isSubmitting ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>
                            ) : "Save Table"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── delete confirmation ──

function DeleteModal({ open, onClose, onConfirm, tableName, isDeleting }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-neutral-950 border border-white/[0.08] rounded-2xl shadow-2xl p-6 text-center animate-[fadeIn_0.2s_ease-out]">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                    <Icon name="trash" className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Delete Table</h3>
                <p className="mt-2 text-sm text-neutral-400">Are you sure you want to delete <span className="font-semibold text-white">{tableName}</span>? This action cannot be undone.</p>
                <div className="flex items-center gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-neutral-300 hover:bg-white/[0.07] transition-colors">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-sm font-bold text-white transition-colors flex items-center justify-center gap-2">
                        {isDeleting ? (
                            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Deleting...</>
                        ) : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── table card ──

function TableCard({ table, onEdit, onDelete, delay }) {
    const s = statusColors[table.status] || statusColors.available;
    const dotColor = table.status === "available" ? "bg-emerald-400" : table.status === "occupied" ? "bg-amber-400" : "bg-red-400";
    return (
        <article className="dashboard-rise dashboard-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: delay }}>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-600/[0.07] blur-2xl transition-all duration-500 group-hover:bg-red-600/15" />
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-red-500/15 bg-red-500/10 p-2.5 text-red-500">
                            <Icon name="table" className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{table.name}</h3>
                            <p className="text-[11px] text-neutral-500 capitalize">{table.tableType}</p>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${s.bg} ${s.border} ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                        {s.label}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Per Hour</p>
                        <p className="mt-1 text-base font-black text-white">Rs. {table.pricePerHour}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Per Frame</p>
                        <p className="mt-1 text-base font-black text-white">Rs. {table.frameRate}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Century</p>
                        <p className="mt-1 text-base font-black text-white">Rs. {table.centuryRate}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onEdit(table)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-neutral-300 hover:bg-white/[0.07] hover:text-white transition-colors">
                        <Icon name="edit" className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button type="button" onClick={() => onDelete(table)} className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-red-500/15 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors">
                        <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </article>
    );
}

// ── main component ──

export default function TableManagement() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTables = () => {
        setLoading(true);
        api.get("/admin/tables")
            .then(({ data }) => setTables(data.tables || []))
            .catch(() => setError("Failed to load tables"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTables(); }, []);

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    const openCreate = () => {
        setEditingTable(null);
        setForm({ ...emptyForm });
        setError(null);
        setModalOpen(true);
    };

    const openEdit = (table) => {
        setEditingTable(table);
        setForm({
            name: table.name,
            tableType: table.tableType,
            status: table.status,
            pricePerHour: table.pricePerHour,
            frameRate: table.frameRate,
            centuryRate: table.centuryRate,
        });
        setError(null);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                name: form.name.trim(),
                tableType: form.tableType,
                status: form.status,
                pricePerHour: Number(form.pricePerHour),
                frameRate: Number(form.frameRate),
                centuryRate: Number(form.centuryRate),
            };

            if (editingTable) {
                await api.put(`/admin/tables/${editingTable._id}`, payload);
                setSuccess(`"${payload.name}" updated successfully`);
            } else {
                await api.post("/admin/tables", payload);
                setSuccess(`"${payload.name}" created successfully`);
            }
            setModalOpen(false);
            fetchTables();
        } catch (err) {
            setError(err.response?.data?.message || "Operation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/admin/tables/${deleteTarget._id}`);
            setSuccess(`"${deleteTarget.name}" deleted successfully`);
            setDeleteTarget(null);
            fetchTables();
        } catch (err) {
            setError(err.response?.data?.message || "Delete failed");
            setDeleteTarget(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const filtered = tables.filter((t) => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.tableType.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const counts = {
        total: tables.length,
        available: tables.filter((t) => t.status === "available").length,
        occupied: tables.filter((t) => t.status === "occupied").length,
        maintenance: tables.filter((t) => t.status === "maintenance").length,
    };

    return (
        <AdminLayout title="Table Management">
            <TableModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setError(null); }}
                onSubmit={handleSubmit}
                form={form}
                setForm={setForm}
                isSubmitting={isSubmitting}
                title={editingTable ? "Edit Table" : "Add New Table"}
            />
            <DeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                tableName={deleteTarget?.name}
                isDeleting={isDeleting}
            />

            {success && (
                <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-[fadeIn_0.2s_ease-out]" role="status">
                    <Icon name="check" className="h-4 w-4" /> {success}
                </div>
            )}
            {error && !modalOpen && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</div>
            )}

            <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        <Icon name="table" className="h-3.5 w-3.5" /> Table Management
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Your Tables</h1>
                    <p className="mt-2 text-sm text-neutral-500">Manage tables, pricing, and availability for your branch.</p>
                </div>
                <button type="button" onClick={openCreate} className="group inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold shadow-lg shadow-red-950/40 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-red-900/50">
                    <Icon name="plus" className="h-4 w-4" /> Add Table
                </button>
            </section>

            <section className="mt-6 flex flex-wrap gap-2">
                {[
                    { label: "Total", count: counts.total, color: "text-white border-white/[0.08] bg-white/[0.03]" },
                    { label: "Available", count: counts.available, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
                    { label: "Occupied", count: counts.occupied, color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
                    { label: "Maintenance", count: counts.maintenance, color: "text-red-400 border-red-500/20 bg-red-500/10" },
                ].map((pill) => (
                    <span key={pill.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${pill.color}`}>
                        {pill.label}: {pill.count}
                    </span>
                ))}
            </section>

            <section className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"><Icon name="search" className="h-4 w-4" /></span>
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables..." className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 appearance-none cursor-pointer">
                    <option value="all" className="bg-neutral-900">All statuses</option>
                    <option value="available" className="bg-neutral-900">Available</option>
                    <option value="occupied" className="bg-neutral-900">Occupied</option>
                    <option value="maintenance" className="bg-neutral-900">Maintenance</option>
                </select>
            </section>

            {loading ? (
                <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-[240px] rounded-2xl border border-white/[0.07] bg-neutral-950/80 animate-pulse" />)}
                </section>
            ) : filtered.length === 0 ? (
                <div className="mt-12 text-center">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                        <Icon name="table" className="h-7 w-7 text-neutral-600" />
                    </div>
                    <p className="text-neutral-400 font-semibold">{tables.length === 0 ? "No tables yet" : "No tables match your search"}</p>
                    <p className="text-neutral-600 text-sm mt-1">{tables.length === 0 ? "Add your first table to get started." : "Try adjusting your filters."}</p>
                    {tables.length === 0 && (
                        <button type="button" onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors">
                            <Icon name="plus" className="h-4 w-4" /> Add Table
                        </button>
                    )}
                </div>
            ) : (
                <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((table, i) => (
                        <TableCard key={table._id} table={table} onEdit={openEdit} onDelete={setDeleteTarget} delay={`${80 + i * 60}ms`} />
                    ))}
                </section>
            )}
        </AdminLayout>
    );
}
