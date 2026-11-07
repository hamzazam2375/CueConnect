import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout, { Icon } from "../components/AdminLayout";
import { inputClass } from "../components/StartGameModal";
import api from "../services/api";

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const todayStamp = () => new Date().toISOString().slice(0, 10);

const RANGE_LABELS = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "the custom date range"
};

const RANGE_OPTIONS = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "year", label: "This Year" },
    { id: "custom", label: "Custom" }
];

function rangeParams(range, from, to) {
    if (range === "custom") return { range: "custom", from, to };
    return { range };
}

function BarPair({ items }) {
    const max = Math.max(1, ...items.flatMap((item) => [item.revenue, item.expenses]));
    return (
        <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
            {items.map((item) => (
                <div key={item.label} className="flex min-w-[2.5rem] flex-1 flex-col items-center gap-1">
                    <div className="flex h-40 w-full items-end justify-center gap-0.5">
                        <div className="w-3 rounded-t bg-emerald-500/80" style={{ height: `${(item.revenue / max) * 100}%` }} title={`Revenue ${formatMoney(item.revenue)}`} />
                        <div className="w-3 rounded-t bg-rose-500/80" style={{ height: `${(item.expenses / max) * 100}%` }} title={`Expenses ${formatMoney(item.expenses)}`} />
                    </div>
                    <p className="max-w-full truncate text-[9px] text-neutral-500">{item.label.slice(5)}</p>
                </div>
            ))}
        </div>
    );
}

function DateBox({ label, value, onChange }) {
    const inputRef = useRef(null);
    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</label>
            <div className="relative">
                <input ref={inputRef} type="date" value={value} onChange={onChange} className={`${inputClass} admin-date-field pr-10`} />
                <button type="button" onClick={() => inputRef.current?.showPicker?.() || inputRef.current?.focus()} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-200" aria-label={`Open ${label} calendar`}>
                    <Icon name="calendar" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function Breakdown({ title, rows }) {
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 1;
    return (
        <article className="rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5">
            <h3 className="text-sm font-bold">{title}</h3>
            <div className="mt-4 space-y-3">
                {rows.map((row) => (
                    <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-neutral-400">{row.label}</span>
                            <span className="font-bold">{formatMoney(row.amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.round((row.amount / total) * 100)}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}

export default function AdminFinance() {
    const [range, setRange] = useState("month");
    const [from, setFrom] = useState(todayStamp());
    const [to, setTo] = useState(todayStamp());
    const params = useMemo(() => rangeParams(range, from, to), [range, from, to]);

    const [overview, setOverview] = useState(null);
    const [analytics, setAnalytics] = useState({ series: [], incomeBySource: [], expensesByCategory: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [income, setIncome] = useState([]);
    const [incomePage, setIncomePage] = useState(1);
    const [incomePages, setIncomePages] = useState(1);
    const [incomeFilters, setIncomeFilters] = useState({ search: "", source: "", method: "", status: "" });

    const [expenses, setExpenses] = useState([]);
    const [expensePage, setExpensePage] = useState(1);
    const [expensePages, setExpensePages] = useState(1);
    const [expenseFilters, setExpenseFilters] = useState({ search: "", category: "" });

    const [reportType, setReportType] = useState("summary");
    const [preview, setPreview] = useState(null);
    const [reportError, setReportError] = useState(null);

    const loadOverview = async () => {
        const { data } = await api.get("/admin/finance", { params });
        setOverview(data.overview);
        setAnalytics(data.analytics || { series: [], incomeBySource: [], expensesByCategory: [] });
    };

    const loadIncome = async (page = 1) => {
        const { data } = await api.get("/admin/finance/income", { params: { ...params, ...incomeFilters, page } });
        setIncome(data.income || []);
        setIncomePage(data.page || 1);
        setIncomePages(data.pages || 1);
    };

    const loadExpenses = async (page = 1) => {
        const { data } = await api.get("/admin/finance/expenses", { params: { ...params, ...expenseFilters, page } });
        setExpenses(data.expenses || []);
        setExpensePage(data.page || 1);
        setExpensePages(data.pages || 1);
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadOverview(), loadIncome(1), loadExpenses(1)]);
        } catch {
            setError("Finance data could not be loaded.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPreview(null);
        setReportError(null);
        refresh();
    }, [range, from, to]);

    useEffect(() => {
        setPreview(null);
        setReportError(null);
    }, [reportType]);

    const reportQuery = () => ({ type: reportType, ...params });

    const loadPreview = async () => {
        setReportError(null);
        try {
            const { data } = await api.get("/admin/finance/report", { params: reportQuery() });
            setPreview(data);
        } catch {
            setReportError("Report could not be generated.");
        }
    };

    const downloadReport = async () => {
        setReportError(null);
        try {
            const { data } = await api.get("/admin/finance/report-pdf", { params: reportQuery(), responseType: "blob" });
            const url = URL.createObjectURL(data);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${reportType}-report.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setReportError("PDF could not be downloaded.");
        }
    };

    return (
        <AdminLayout title="Finance & Reports">
            {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            <section className="dashboard-rise">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                    <Icon name="chart" className="h-3.5 w-3.5" /> Finance
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Finance & Reports</h1>
                <p className="mt-2 text-sm text-neutral-500">Collected payments only. Pending bills are not counted as revenue.</p>
            </section>

            <div className="mt-6 flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((item) => (
                    <button key={item.id} type="button" onClick={() => setRange(item.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${range === item.id ? "bg-red-600 text-white" : "border border-white/[0.08] text-neutral-400"}`}>
                        {item.label}
                    </button>
                ))}
            </div>
            {range === "custom" && (
                <div className="mt-4 max-w-xl rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-4">
                    <p className="text-sm font-semibold text-white">Choose a date range</p>
                    <p className="mt-1 text-xs text-neutral-500">Overview, analytics, records, and reports all use these dates.</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <DateBox label="Start date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        <DateBox label="End date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                </div>
            )}

            {loading ? (
                <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/[0.07] bg-neutral-950/80" />)}</section>
            ) : (
                <>
                    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <OverviewCard label="Total Revenue" value={formatMoney(overview?.revenue)} color="text-emerald-400" />
                        <OverviewCard label="Total Expenses" value={formatMoney(overview?.expenses)} color="text-rose-400" />
                        <OverviewCard label="Net Profit" value={formatMoney(overview?.netProfit)} color={(overview?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"} />
                        <OverviewCard label="Pending Payments" value={formatMoney(overview?.pendingPayments)} color="text-amber-400" />
                    </section>

                    <section className="mt-10">
                        <h2 className="text-2xl font-black">Financial Analytics</h2>
                        <div className="mt-4 grid gap-4 xl:grid-cols-3">
                            <article className="rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5 xl:col-span-3">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-sm font-bold">Revenue vs Expenses</h3>
                                    <p className="text-[10px] text-neutral-500"><span className="mr-2 text-emerald-400">Revenue</span><span className="text-rose-400">Expenses</span></p>
                                </div>
                                {analytics.series.length ? <BarPair items={analytics.series} /> : <p className="py-10 text-center text-sm text-neutral-600">No activity in this period.</p>}
                            </article>
                            <Breakdown title="Income sources" rows={analytics.incomeBySource} />
                            <Breakdown title="Expense categories" rows={analytics.expensesByCategory} />
                        </div>
                    </section>

                    <section className="mt-10">
                        <h2 className="text-2xl font-black">Income Records</h2>
                        <form onSubmit={(e) => { e.preventDefault(); loadIncome(1); }} className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
                            <input value={incomeFilters.search} onChange={(e) => setIncomeFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search description" className={inputClass} />
                            <select value={incomeFilters.source} onChange={(e) => setIncomeFilters((f) => ({ ...f, source: e.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">All sources</option>
                                <option value="frame" className="bg-neutral-900">Frame Games</option>
                                <option value="century" className="bg-neutral-900">Century Games</option>
                                <option value="tournament" className="bg-neutral-900">Tournament Fees</option>
                                <option value="other" className="bg-neutral-900">Other Income</option>
                            </select>
                            <select value={incomeFilters.method} onChange={(e) => setIncomeFilters((f) => ({ ...f, method: e.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">All methods</option>
                                <option value="cash" className="bg-neutral-900">Cash</option>
                                <option value="online" className="bg-neutral-900">Online</option>
                                <option value="card" className="bg-neutral-900">Card</option>
                            </select>
                            <select value={incomeFilters.status} onChange={(e) => setIncomeFilters((f) => ({ ...f, status: e.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">All statuses</option>
                                <option value="completed" className="bg-neutral-900">Collected</option>
                                <option value="refunded" className="bg-neutral-900">Refunded</option>
                            </select>
                            <button type="submit" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">Filter</button>
                        </form>
                        <RecordTable
                            columns={["Description", "Income Source", "Amount", "Payment Method", "Date", "Status"]}
                            empty="No income records for this period."
                            rows={income.map((item) => [item.description, item.sourceLabel, formatMoney(item.amount), item.paymentMethod || "—", formatDate(item.date), item.status === "refunded" ? "Refunded" : "Collected"])}
                            page={incomePage}
                            pages={incomePages}
                            onPage={(next) => loadIncome(next)}
                        />
                    </section>

                    <section className="mt-10">
                        <h2 className="text-2xl font-black">Expense Records</h2>
                        <form onSubmit={(e) => { e.preventDefault(); loadExpenses(1); }} className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                            <input value={expenseFilters.search} onChange={(e) => setExpenseFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search expense" className={inputClass} />
                            <select value={expenseFilters.category} onChange={(e) => setExpenseFilters((f) => ({ ...f, category: e.target.value }))} className={`${inputClass} appearance-none`}>
                                <option value="" className="bg-neutral-900">All categories</option>
                                <option value="rent" className="bg-neutral-900">Rent</option>
                                <option value="utilities" className="bg-neutral-900">Utilities</option>
                                <option value="equipment" className="bg-neutral-900">Equipment</option>
                                <option value="salary" className="bg-neutral-900">Salary</option>
                                <option value="maintenance" className="bg-neutral-900">Maintenance</option>
                                <option value="other" className="bg-neutral-900">Other</option>
                            </select>
                            <button type="submit" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">Filter</button>
                        </form>
                        <RecordTable
                            columns={["Description", "Category", "Amount", "Payment Method", "Date", "Recorded By"]}
                            empty="No expense records for this period."
                            rows={expenses.map((item) => [item.description, item.categoryLabel, formatMoney(item.amount), item.paymentMethod || "—", formatDate(item.date), item.recordedBy])}
                            page={expensePage}
                            pages={expensePages}
                            onPage={(next) => loadExpenses(next)}
                        />
                    </section>
                </>
            )}

            <section className="mt-10 mb-8">
                <h2 className="text-2xl font-black">Financial Reports</h2>
                <p className="mt-1 text-sm text-neutral-500">Reports use <span className="font-semibold text-neutral-300">{RANGE_LABELS[range]}</span> from the filters above. Daily and monthly titles are applied automatically when those ranges are selected.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={`${inputClass} appearance-none`}>
                        <option value="summary" className="bg-neutral-900">Financial Report</option>
                        <option value="income" className="bg-neutral-900">Income Report</option>
                        <option value="expense" className="bg-neutral-900">Expense Report</option>
                    </select>
                    <button type="button" onClick={loadPreview} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-bold">Preview</button>
                    <button type="button" onClick={downloadReport} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold hover:bg-red-500">Download PDF</button>
                </div>
                {reportError && <p className="mt-3 text-sm text-red-400">{reportError}</p>}
                {preview && (
                    <article className="mt-4 rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5">
                        <h3 className="text-lg font-black">{preview.title}</h3>
                        <p className="text-sm text-neutral-500">{preview.period}</p>
                        <pre className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-neutral-300">{preview.lines.join("\n")}</pre>
                    </article>
                )}
            </section>
        </AdminLayout>
    );
}

function OverviewCard({ label, value, color }) {
    return (
        <article className="rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
        </article>
    );
}

function RecordTable({ columns, rows, empty, page, pages, onPage }) {
    return (
        <>
            {rows.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-white/[0.1] px-6 py-10 text-center text-sm text-neutral-600">{empty}</p>
            ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-neutral-500">
                            <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index} className="border-t border-white/[0.06]">
                                    {row.map((cell, cellIndex) => <td key={cellIndex} className={`px-4 py-3 ${cellIndex === 0 ? "font-semibold" : "text-neutral-300"}`}>{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
                <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                <span className="px-2 py-1.5 text-xs text-neutral-500">{page} / {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
            </div>
        </>
    );
}
