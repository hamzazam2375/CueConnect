import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import api from "../services/api";

const inputClass = "admin-filter-field w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30";
const emptyFilters = { from: "", to: "", customerId: "", payer: "", status: "", method: "" };

const statusStyles = {
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    partial: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function FilterSelect({ value, onChange, children }) {
    return (
        <div className="relative min-w-0">
            <select value={value} onChange={onChange} className={`${inputClass} appearance-none pr-10`}>
                {children}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300"><Icon name="chevronDown" className="h-4 w-4" /></span>
        </div>
    );
}

function DateFilter({ value, onChange, label }) {
    const inputRef = useRef(null);
    return (
        <div className="relative min-w-0">
            <input ref={inputRef} type="date" value={value} onChange={onChange} aria-label={label} className={`${inputClass} admin-date-field pr-10`} />
            <button type="button" onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.focus()} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-200" aria-label={`Open ${label} calendar`}>
                <Icon name="calendar" className="h-4 w-4" />
            </button>
        </div>
    );
}

function StatusBadge({ status }) {
    return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] || statusStyles.pending}`}>{status === "partial" ? "Partially paid" : status}</span>;
}

export default function AdminBilling() {
    const [tab, setTab] = useState("pending");
    const [bills, setBills] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [filters, setFilters] = useState(emptyFilters);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [detail, setDetail] = useState(null);
    const [discountAmount, setDiscountAmount] = useState("");
    const [rewardKey, setRewardKey] = useState("");
    const [rewardPoints, setRewardPoints] = useState("200");
    const [payForm, setPayForm] = useState({ amount: "", method: "cash" });
    const [saving, setSaving] = useState(false);

    const loadBills = async (nextFilters = filters) => {
        const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
        const [{ data: billData }, { data: customerData }] = await Promise.all([
            api.get("/admin/bills", { params }),
            api.get("/admin/customers")
        ]);
        setBills(billData.bills || []);
        setCustomers(customerData.customers || []);
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            await loadBills();
        } catch {
            setError("Bills could not be loaded.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);
    useEffect(() => {
        if (!success) return undefined;
        const timer = setTimeout(() => setSuccess(null), 3000);
        return () => clearTimeout(timer);
    }, [success]);

    const visibleBills = useMemo(() => {
        if (tab === "pending") return bills.filter((bill) => bill.status === "pending" || bill.status === "partial");
        if (tab === "paid") return bills.filter((bill) => bill.status === "paid");
        return bills;
    }, [bills, tab]);

    const openDetail = async (bill) => {
        setError(null);
        try {
            const { data } = await api.get(`/admin/bills/${bill.id}`);
            setDetail(data.bill);
            setPayForm({ amount: data.bill.remainingBalance || "", method: "cash" });
            setDiscountAmount(data.bill.discountAmount || "");
            setRewardKey("");
            setRewardPoints("200");
        } catch {
            setError("Bill details could not be loaded.");
        }
    };

    const applyDiscount = async () => {
        if (!detail) return;
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.patch(`/admin/bills/${detail.id}/discount`, {
                amount: Number(discountAmount)
            });
            setDetail(data.bill);
            setPayForm((form) => ({ ...form, amount: data.bill.remainingBalance }));
            await loadBills();
            setSuccess("Discount applied");
        } catch (err) {
            setError(err.response?.data?.message || "Discount could not be applied");
        } finally {
            setSaving(false);
        }
    };

    const redeemReward = async () => {
        if (!detail || !rewardKey) return;
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.post(`/admin/bills/${detail.id}/loyalty-reward`, {
                reward: rewardKey,
                points: Number(rewardPoints)
            });
            setDetail(data.bill);
            setDiscountAmount(data.bill.discountAmount || "");
            setPayForm((form) => ({ ...form, amount: data.bill.remainingBalance }));
            await loadBills();
            setSuccess("Loyalty reward redeemed");
        } catch (err) {
            setError(err.response?.data?.message || "Loyalty reward could not be redeemed");
        } finally {
            setSaving(false);
        }
    };

    const recordPayment = async () => {
        if (!detail) return;
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.post(`/admin/bills/${detail.id}/payments`, {
                amount: Number(payForm.amount),
                method: payForm.method
            });
            setDetail(data.bill);
            setPayForm({ amount: data.bill.remainingBalance || "", method: "cash" });
            await loadBills();
            setSuccess(data.bill.status === "paid" ? "Bill marked as paid" : "Payment recorded");
        } catch (err) {
            setError(err.response?.data?.message || "Payment could not be recorded");
        } finally {
            setSaving(false);
        }
    };

    const downloadReceipt = async (bill) => {
        const { data } = await api.get(`/admin/bills/${bill.id}/receipt`, { responseType: "blob" });
        const url = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${bill.reference}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout title="Billing">
            {detail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)} />
                    <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-neutral-950 p-6 sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Bill details</p>
                                <h2 className="mt-1 text-2xl font-black">{detail.reference}</h2>
                                <p className="mt-1 text-sm text-neutral-500">{detail.payerName}{detail.customerId ? ` · ${detail.customerId}` : " · Walk-in"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={detail.status} />
                                <button type="button" onClick={() => setDetail(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500" aria-label="Close"><Icon name="x" className="h-4 w-4" /></button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-4">
                            <Summary label="Original" value={formatMoney(detail.originalAmount)} />
                            <Summary label="Discount" value={formatMoney(detail.discountAmount)} />
                            <Summary label="Payable" value={formatMoney(detail.payableAmount)} />
                            <Summary label="Balance" value={formatMoney(detail.remainingBalance)} accent />
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Games</h3>
                        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.07]">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                                    <tr>
                                        <th className="px-4 py-3">Player</th>
                                        <th className="px-4 py-3">Table</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Charge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.games.map((game) => (
                                        <tr key={game.id} className="border-t border-white/[0.06]">
                                            <td className="px-4 py-3"><p className="font-semibold">{game.playerName}</p><p className="text-[11px] text-neutral-600">{game.customerId || "Walk-in"}</p></td>
                                            <td className="px-4 py-3">{game.tableName}</td>
                                            <td className="px-4 py-3 capitalize">{game.type}{game.frameType ? ` · ${game.frameType}` : ""}</td>
                                            <td className="px-4 py-3 font-bold">{formatMoney(game.charge)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-neutral-500">Payment history</h3>
                        {detail.payments.length ? (
                            <div className="mt-3 space-y-2">
                                {detail.payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3 text-sm">
                                        <span className="capitalize text-neutral-300">{payment.method} · {formatDateTime(payment.createdAt)}</span>
                                        <span className="font-bold">{formatMoney(payment.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="mt-2 text-sm text-neutral-600">No payments recorded yet.</p>}

                        {error && detail && <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

                        {detail.status !== "paid" && (
                            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                                <div className="rounded-2xl border border-white/[0.08] p-4">
                                    <p className="text-sm font-bold">Manual discount</p>
                                    <p className="mt-1 text-xs text-neutral-500">Admin-only concession. It is deducted directly from this bill.</p>
                                    <input type="number" min="0" step="1" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className={`${inputClass} mt-3`} placeholder="Discount amount" />
                                    <button type="button" disabled={saving || detail.loyaltyRedemption} onClick={applyDiscount} className="mt-3 w-full rounded-xl bg-white/[0.06] py-2.5 text-sm font-bold hover:bg-white/[0.1] disabled:text-neutral-600">Save discount</button>
                                    {detail.payerUser && (
                                        <div className="mt-5 border-t border-white/[0.08] pt-4">
                                            <p className="text-sm font-bold">Loyalty rewards</p>
                                            <p className="mt-1 text-xs text-neutral-500">Available points: <span className="font-bold text-white">{detail.loyaltyPoints || 0}</span></p>
                                            {detail.eligibleRewards?.length ? (
                                                <>
                                                    <select value={rewardKey} onChange={(e) => setRewardKey(e.target.value)} className={`${inputClass} mt-3 appearance-none`}>
                                                        <option value="" className="bg-neutral-900">Choose a reward</option>
                                                        {detail.eligibleRewards.map((reward) => <option key={reward.key} value={reward.key} className="bg-neutral-900">{reward.label} · {reward.points} points minimum</option>)}
                                                    </select>
                                                    {rewardKey === "century_discount" && <input type="number" min="200" step="1" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} className={`${inputClass} mt-3`} placeholder="Points to redeem" />}
                                                    <button type="button" disabled={!rewardKey || saving} onClick={redeemReward} className="mt-3 w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/20 disabled:text-neutral-600">Redeem reward</button>
                                                </>
                                            ) : <p className="mt-2 text-xs text-neutral-600">Rewards become available at 200 points for the matching game type.</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-2xl border border-white/[0.08] p-4">
                                    <p className="text-sm font-bold">Record payment</p>
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <input type="number" min="0" step="1" value={payForm.amount} onChange={(e) => setPayForm((form) => ({ ...form, amount: e.target.value }))} className={inputClass} />
                                        <select value={payForm.method} onChange={(e) => setPayForm((form) => ({ ...form, method: e.target.value }))} className={`${inputClass} appearance-none`}>
                                            <option value="cash" className="bg-neutral-900">Cash</option>
                                            <option value="online" className="bg-neutral-900">Online</option>
                                            <option value="card" className="bg-neutral-900">Card</option>
                                        </select>
                                    </div>
                                    <button type="button" disabled={saving} onClick={recordPayment} className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">Record payment</button>
                                </div>
                            </div>
                        )}

                        {detail.status === "paid" && (
                            <button type="button" onClick={() => downloadReceipt(detail)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">
                                <Icon name="file" className="h-4 w-4" /> Download receipt
                            </button>
                        )}
                    </div>
                </div>
            )}

            {success && <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{success}</div>}
            {error && !detail && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <section className="dashboard-rise flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        <Icon name="dollar" className="h-3.5 w-3.5" /> Billing
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Bills</h1>
                    <p className="mt-2 text-sm text-neutral-500">Pending bills first. Games for the same payer stay on one open bill until it is fully paid.</p>
                </div>
            </section>

            <div className="mt-6 flex gap-2">
                {[
                    { id: "pending", label: "Pending" },
                    { id: "all", label: "All bills" },
                    { id: "paid", label: "Paid" }
                ].map((item) => (
                    <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${tab === item.id ? "bg-red-600 text-white" : "border border-white/[0.08] text-neutral-400"}`}>
                        {item.label}
                    </button>
                ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); loadBills(); }} className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
                <input value={filters.payer} onChange={(e) => setFilters((f) => ({ ...f, payer: e.target.value }))} placeholder="Payer name" className={inputClass} />
                <DateFilter label="Start date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
                <DateFilter label="End date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
                <FilterSelect value={filters.customerId} onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value }))}>
                    <option value="" className="bg-neutral-900">All customers</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id} className="bg-neutral-900">{customer.name}</option>)}
                </FilterSelect>
                <FilterSelect value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                    <option value="" className="bg-neutral-900">All statuses</option>
                    <option value="pending" className="bg-neutral-900">Pending</option>
                    <option value="partial" className="bg-neutral-900">Partially paid</option>
                    <option value="paid" className="bg-neutral-900">Paid</option>
                </FilterSelect>
                <FilterSelect value={filters.method} onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}>
                    <option value="" className="bg-neutral-900">All methods</option>
                    <option value="cash" className="bg-neutral-900">Cash</option>
                    <option value="online" className="bg-neutral-900">Online</option>
                    <option value="card" className="bg-neutral-900">Card</option>
                </FilterSelect>
                <button type="submit" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500">Filter</button>
            </form>

            {loading ? (
                <section className="mt-6 h-40 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />
            ) : visibleBills.length === 0 ? (
                <section className="mt-8 rounded-3xl border border-dashed border-white/[0.1] px-6 py-14 text-center">
                    <p className="font-bold">No bills in this view</p>
                    <p className="mt-1 text-sm text-neutral-600">Completed games create or join a pending bill for the payer.</p>
                </section>
            ) : (
                <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                            <tr>
                                <th className="px-4 py-3">Bill</th>
                                <th className="px-4 py-3">Payer</th>
                                <th className="hidden px-4 py-3 sm:table-cell">Games</th>
                                <th className="hidden px-4 py-3 md:table-cell">Date</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="hidden px-4 py-3 lg:table-cell">Due</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right"> </th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleBills.map((bill) => (
                                <tr key={bill.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                                    <td className="px-4 py-3 font-bold text-red-400">{bill.reference}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">{bill.payerName}</p>
                                        <p className="text-[11px] text-neutral-600">{bill.customerId || "Walk-in"}</p>
                                    </td>
                                    <td className="hidden px-4 py-3 text-neutral-400 sm:table-cell">{bill.games?.length || 0}</td>
                                    <td className="hidden px-4 py-3 text-neutral-400 md:table-cell">{formatDate(bill.billDate)}</td>
                                    <td className="px-4 py-3 font-bold">{formatMoney(bill.payableAmount || bill.originalAmount)}</td>
                                    <td className="hidden px-4 py-3 text-neutral-400 lg:table-cell">{bill.status === "paid" ? "—" : formatMoney(bill.remainingBalance)}</td>
                                    <td className="px-4 py-3"><StatusBadge status={bill.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => openDetail(bill)} className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-bold hover:bg-white/[0.1]">View</button>
                                            {bill.status === "paid" && <button type="button" onClick={() => downloadReceipt(bill)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold">PDF</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </AdminLayout>
    );
}

function Summary({ label, value, accent }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-600">{label}</p>
            <p className={`mt-1 text-lg font-black ${accent ? "text-red-400" : "text-white"}`}>{value}</p>
        </div>
    );
}
