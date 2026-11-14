import { useEffect, useState } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import { ModalShell, inputClass, labelClass } from "../components/StartGameModal";
import api from "../services/api";
import { apiError, formatDate, formatMoney } from "../utils/adminFormat";
import { PASSWORD_RULES, passwordError } from "../utils/passwordPolicy";

const emptyRegister = { firstName: "", lastName: "", email: "", phone: "", password: "" };

function StatusBadge({ active }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-neutral-500/20 bg-neutral-500/10 text-neutral-400"}`}>
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function Summary({ label, value }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</p>
            <p className="mt-1 text-lg font-black text-white">{value}</p>
        </div>
    );
}

export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [registerOpen, setRegisterOpen] = useState(false);
    const [registerForm, setRegisterForm] = useState(emptyRegister);
    const [saving, setSaving] = useState(false);

    const [detail, setDetail] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "", isActive: true });

    const fetchCustomers = (nextPage, nextSearch) => api.get("/admin/customers", {
        params: { page: nextPage, limit: 10, search: nextSearch || undefined }
    }).then(({ data }) => data);

    const applyCustomers = (data) => {
        setCustomers(data.customers || []);
        setPage(data.page || 1);
        setPages(data.pages || 1);
        setTotal(data.total || 0);
    };

    const loadCustomers = async (nextPage = page, nextSearch = search) => applyCustomers(await fetchCustomers(nextPage, nextSearch));

    const refresh = async (nextPage = page, nextSearch = search) => {
        setLoading(true);
        setError(null);
        try {
            await loadCustomers(nextPage, nextSearch);
        } catch {
            setError("Customers could not be loaded.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers(1, "")
            .then(applyCustomers)
            .catch(() => setError("Customers could not be loaded."))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        if (!success) return undefined;
        const timer = setTimeout(() => setSuccess(null), 3000);
        return () => clearTimeout(timer);
    }, [success]);

    const openDetails = async (customer) => {
        setError(null);
        try {
            const { data } = await api.get(`/admin/customers/${customer.id}`);
            setDetail(data.customer);
            setEditForm({
                firstName: data.customer.firstName,
                lastName: data.customer.lastName,
                email: data.customer.email,
                phone: data.customer.phone || "",
                isActive: data.customer.isActive
            });
            return data.customer;
        } catch {
            setError("Customer details could not be loaded.");
            return null;
        }
    };

    const submitRegister = async () => {
        const weak = passwordError(registerForm.password);
        if (weak) {
            setError(weak);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.post("/admin/customers", registerForm);
            setRegisterOpen(false);
            setRegisterForm(emptyRegister);
            setSuccess(`Customer registered · ${data.customer.customerId}`);
            await loadCustomers(1, search);
        } catch (err) {
            setError(apiError(err, "Customer could not be registered"));
        } finally {
            setSaving(false);
        }
    };

    const submitEdit = async () => {
        if (!detail) return;
        setSaving(true);
        setError(null);
        try {
            await api.patch(`/admin/customers/${detail.id}`, editForm);
            setEditOpen(false);
            setSuccess("Customer updated");
            await openDetails(detail);
            await loadCustomers(page, search);
        } catch (err) {
            setError(apiError(err, "Customer could not be updated"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout title="Customers">
            {registerOpen && (
                <ModalShell title="Register Customer" onClose={() => setRegisterOpen(false)}>
                    <form onSubmit={(e) => { e.preventDefault(); submitRegister(); }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>First name</label>
                                <input required value={registerForm.firstName} onChange={(e) => setRegisterForm((form) => ({ ...form, firstName: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Last name</label>
                                <input required value={registerForm.lastName} onChange={(e) => setRegisterForm((form) => ({ ...form, lastName: e.target.value }))} className={inputClass} />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Email</label>
                                <input required type="email" value={registerForm.email} onChange={(e) => setRegisterForm((form) => ({ ...form, email: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone (optional)</label>
                                <input type="tel" value={registerForm.phone} onChange={(e) => setRegisterForm((form) => ({ ...form, phone: e.target.value }))} placeholder="+92 300 1234567" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Temporary password</label>
                            <input required type="password" autoComplete="new-password" minLength={8} value={registerForm.password} onChange={(e) => setRegisterForm((form) => ({ ...form, password: e.target.value }))} className={inputClass} />
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {PASSWORD_RULES.map((rule) => (
                                    <li key={rule.label} className={rule.test(registerForm.password) ? "text-emerald-400" : "text-neutral-600"}>{rule.test(registerForm.password) ? "✓" : "•"} {rule.label}</li>
                                ))}
                            </ul>
                        </div>
                        <p className="text-xs text-neutral-600">A unique Customer ID is generated automatically. The customer confirms their email with a code the first time they sign in. Walk-in players are not registered here.</p>
                        {error && registerOpen && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setRegisterOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Saving..." : "Register"}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {editOpen && detail && (
                <ModalShell title="Edit customer" onClose={() => setEditOpen(false)}>
                    <form onSubmit={(e) => { e.preventDefault(); submitEdit(); }} className="space-y-4">
                        <div>
                            <label className={labelClass}>Customer ID</label>
                            <input value={detail.customerId} disabled className={`${inputClass} opacity-60`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>First name</label>
                                <input required value={editForm.firstName} onChange={(e) => setEditForm((form) => ({ ...form, firstName: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Last name</label>
                                <input required value={editForm.lastName} onChange={(e) => setEditForm((form) => ({ ...form, lastName: e.target.value }))} className={inputClass} />
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Email</label>
                                <input required type="email" value={editForm.email} onChange={(e) => setEditForm((form) => ({ ...form, email: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((form) => ({ ...form, phone: e.target.value }))} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Account status</label>
                            <select value={editForm.isActive ? "active" : "inactive"} onChange={(e) => setEditForm((form) => ({ ...form, isActive: e.target.value === "active" }))} className={`${inputClass} appearance-none`}>
                                <option value="active" className="bg-neutral-900">Active</option>
                                <option value="inactive" className="bg-neutral-900">Inactive</option>
                            </select>
                            <p className="mt-1.5 text-[11px] text-neutral-600">Inactive customers can&apos;t be picked for new games, bills, or bookings.</p>
                        </div>
                        {error && editOpen && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setEditOpen(false)} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Saving..." : "Save"}</button>
                        </div>
                    </form>
                </ModalShell>
            )}

            {detail && !editOpen && (
                <ModalShell size="lg" eyebrow="Customer details" title={detail.name} onClose={() => { setDetail(null); setError(null); }} actions={<StatusBadge active={detail.isActive} />}>
                        <p className="-mt-4 text-sm text-neutral-500">{detail.customerId}</p>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Personal information</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Summary label="Customer ID" value={detail.customerId} />
                            <Summary label="Name" value={detail.name} />
                            <Summary label="Email" value={<span className="break-all">{detail.email}</span>} />
                            <Summary label="Phone" value={detail.phone || "—"} />
                            <Summary label="Registered" value={formatDate(detail.createdAt)} />
                            <Summary label="Account status" value={detail.isActive ? "Active" : "Inactive"} />
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Game history</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Summary label="Games as player" value={detail.gamesAsPlayer} />
                            <Summary label="Games as payer" value={detail.gamesAsPayer} />
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Booking history</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Summary label="Bookings made" value={detail.bookingsMade} />
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Billing summary</h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Summary label="Total paid" value={formatMoney(detail.billing?.totalPaid)} />
                            <Summary label="Pending" value={formatMoney(detail.billing?.pendingAmount)} />
                            <Summary label="Partially paid outstanding" value={formatMoney(detail.billing?.partialAmount)} />
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Loyalty points</h3>
                        <div className="mt-3 max-w-xs"><Summary label="Available points" value={detail.loyaltyPoints} /></div>

                        {error && detail && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                        <button type="button" onClick={() => setEditOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">
                            <Icon name="edit" className="h-4 w-4" /> Edit
                        </button>
                </ModalShell>
            )}

            {success && <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{success}</div>}
            {error && !registerOpen && !editOpen && !detail && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        <Icon name="users" className="h-3.5 w-3.5" /> Customers
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Registered customers</h1>
                    <p className="mt-2 text-sm text-neutral-500">Walk-in names stay on games and bills only. This list is registered accounts.</p>
                </div>
                <button type="button" onClick={() => { setError(null); setRegisterOpen(true); }} className="inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500">
                    <Icon name="plus" className="h-4 w-4" /> Register Customer
                </button>
            </section>

            <form onSubmit={(e) => { e.preventDefault(); refresh(1, search); }} className="mt-5 flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, or email" className={`${inputClass} flex-1`} />
                <button type="submit" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">Search</button>
            </form>

            {loading ? (
                <section className="mt-6 h-40 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />
            ) : customers.length === 0 ? (
                <section className="mt-8 rounded-3xl border border-dashed border-white/[0.1] px-6 py-14 text-center">
                    <p className="font-bold">{search ? "No customers match your search" : "No registered customers"}</p>
                    <p className="mt-1 text-sm text-neutral-600">{search ? "Try a name, Customer ID, or email." : "Register a customer to generate a unique Customer ID."}</p>
                </section>
            ) : (
                <>
                    <section className="mt-6 overflow-x-auto rounded-2xl border border-white/[0.07]">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                                <tr>
                                    <th className="px-4 py-3">Customer ID</th>
                                    <th className="px-4 py-3">Customer name</th>
                                    <th className="hidden px-4 py-3 md:table-cell">Email</th>
                                    <th className="px-4 py-3">Loyalty points</th>
                                    <th className="px-4 py-3">Account status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <tr key={customer.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                                        <td className="whitespace-nowrap px-4 py-3 font-bold text-red-400">{customer.customerId}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">{customer.name}</p>
                                            <p className="text-[11px] text-neutral-600 md:hidden">{customer.email}</p>
                                        </td>
                                        <td className="hidden px-4 py-3 text-neutral-400 md:table-cell">{customer.email}</td>
                                        <td className="px-4 py-3 font-bold">{customer.loyaltyPoints}</td>
                                        <td className="px-4 py-3"><StatusBadge active={customer.isActive} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2 whitespace-nowrap">
                                                <button type="button" onClick={() => openDetails(customer)} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold hover:bg-white/[0.1]">View Details</button>
                                                <button type="button" onClick={async () => { const next = await openDetails(customer); if (next) setEditOpen(true); }} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold">Edit</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
                        <p>{total} customer{total === 1 ? "" : "s"}</p>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => refresh(page - 1, search)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                            <span className="px-2 py-1.5 text-xs">{page} / {pages}</span>
                            <button type="button" disabled={page >= pages} onClick={() => refresh(page + 1, search)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
