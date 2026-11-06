import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AdminLayout, { Icon } from "../components/AdminLayout";
import StartGameModal from "../components/StartGameModal";
import api from "../services/api";

function StatCard({ icon, label, value, subValue, delay, iconColor = "red" }) {
    const colorMap = {
        red:     { bg: "bg-red-500/10",     border: "border-red-500/15",     text: "text-red-500",     glow: "bg-red-600/[0.07] group-hover:bg-red-600/15" },
        emerald: { bg: "bg-emerald-500/10",  border: "border-emerald-500/15", text: "text-emerald-500", glow: "bg-emerald-600/[0.07] group-hover:bg-emerald-600/15" },
        amber:   { bg: "bg-amber-500/10",    border: "border-amber-500/15",   text: "text-amber-500",   glow: "bg-amber-600/[0.07] group-hover:bg-amber-600/15" },
        blue:    { bg: "bg-blue-500/10",     border: "border-blue-500/15",    text: "text-blue-500",    glow: "bg-blue-600/[0.07] group-hover:bg-blue-600/15" },
        violet:  { bg: "bg-violet-500/10",   border: "border-violet-500/15",  text: "text-violet-500",  glow: "bg-violet-600/[0.07] group-hover:bg-violet-600/15" },
        rose:    { bg: "bg-rose-500/10",     border: "border-rose-500/15",    text: "text-rose-500",    glow: "bg-rose-600/[0.07] group-hover:bg-rose-600/15" },
    };
    const c = colorMap[iconColor] || colorMap.red;

    return (
        <article className="dashboard-rise dashboard-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: delay }}>
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${c.glow} blur-2xl transition-all duration-500`} />
            <div className="relative">
                <div className="flex items-center justify-between">
                    <div className={`rounded-xl ${c.border} ${c.bg} p-2.5 ${c.text} transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3`}>
                        <Icon name={icon} className="h-5 w-5" />
                    </div>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">{label}</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-white">{value}</p>
                {subValue && <p className="mt-1 text-xs text-neutral-500">{subValue}</p>}
            </div>
        </article>
    );
}

function PendingRow({ label, count }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
            <span className="text-sm text-neutral-300">{label}</span>
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
                {count}
            </span>
        </div>
    );
}

function OccupancyBar({ occupied, total }) {
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const barColor = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";
    const textColor = pct >= 80 ? "text-red-400" : pct >= 50 ? "text-amber-400" : "text-emerald-400";

    return (
        <article className="dashboard-rise dashboard-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: "380ms" }}>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-600/[0.07] blur-2xl transition-all duration-500 group-hover:bg-blue-600/15" />
            <div className="relative">
                <div className="flex items-center justify-between">
                    <div className="rounded-xl border border-blue-500/15 bg-blue-500/10 p-2.5 text-blue-500 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                        <Icon name="pieChart" className="h-5 w-5" />
                    </div>
                    <span className={`text-2xl font-black ${textColor}`}>{pct}%</span>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Table Occupancy</p>
                <div className="mt-2 h-2 w-full rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">{occupied} of {total} tables occupied</p>
            </div>
        </article>
    );
}

function ActivityItem({ item }) {
    const iconMap = { booking: "calendar", game: "gamepad", income: "dollar" };
    const colorMap = {
        booking: { bg: "bg-blue-500/10",    text: "text-blue-400" },
        game:    { bg: "bg-violet-500/10",   text: "text-violet-400" },
        income:  { bg: "bg-emerald-500/10",  text: "text-emerald-400" },
    };
    const statusBadge = {
        pending:   { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
        approved:  { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
        active:    { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
        completed: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
        rejected:  { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
        cancelled: { bg: "bg-neutral-500/10 border-neutral-500/20", text: "text-neutral-400" },
    };

    const c = colorMap[item.type] || colorMap.booking;
    const s = statusBadge[item.status] || statusBadge.completed;
    const timeAgo = getTimeAgo(item.time);

    return (
        <div className="flex items-start gap-3 py-3 border-b border-white/[0.05] last:border-0">
            <div className={`mt-0.5 shrink-0 rounded-lg ${c.bg} p-2 ${c.text}`}>
                <Icon name={iconMap[item.type] || "activity"} className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-200 truncate">{item.message}</p>
                <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-neutral-600">{timeAgo}</span>
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${s.bg} ${s.text}`}>
                        {item.status}
                    </span>
                </div>
            </div>
        </div>
    );
}

function QuickActionButton({ icon, label, onClick, color = "red" }) {
    const colorMap = {
        red:     "border-red-500/15 bg-red-500/[0.07] text-red-400 hover:bg-red-500/15",
        emerald: "border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-400 hover:bg-emerald-500/15",
        blue:    "border-blue-500/15 bg-blue-500/[0.07] text-blue-400 hover:bg-blue-500/15",
        amber:   "border-amber-500/15 bg-amber-500/[0.07] text-amber-400 hover:bg-amber-500/15",
        violet:  "border-violet-500/15 bg-violet-500/[0.07] text-violet-400 hover:bg-violet-500/15",
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${colorMap[color] || colorMap.red}`}
        >
            <Icon name={icon} className="h-4 w-4" />
            {label}
        </button>
    );
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function AdminDashboard() {
    const { user, error } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [startOpen, setStartOpen] = useState(false);
    const [startSuccess, setStartSuccess] = useState(null);
    const navigate = useNavigate();

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

    useEffect(() => {
        api.get("/admin/dashboard-stats")
            .then(({ data }) => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    const netProfit = (stats?.todayIncome ?? 0) - (stats?.todayExpenses ?? 0);

    return (
        <AdminLayout title="Admin Dashboard">
            <StartGameModal
                open={startOpen}
                onClose={() => setStartOpen(false)}
                onStarted={() => {
                    setStartSuccess("Game started");
                    setTimeout(() => setStartSuccess(null), 3000);
                    api.get("/admin/dashboard-stats").then(({ data }) => setStats(data)).catch(() => {});
                }}
            />
            {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</div>}
            {startSuccess && <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{startSuccess}</div>}

            <section className="dashboard-rise">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                    <Icon name="target" className="h-3.5 w-3.5" /> Branch overview
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl xl:text-5xl">
                    {greeting}, <span className="text-red-500">{user?.firstName}</span>.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">
                    Here&apos;s what&apos;s happening at your branch today.
                </p>
            </section>

            {statsLoading ? (
                <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[140px] rounded-2xl border border-white/[0.07] bg-neutral-950/80 animate-pulse" />
                    ))}
                </section>
            ) : (
                <>
                    {/* ── Tables & Operations Stats ── */}
                    <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-4" aria-label="Tables and operations">
                        <StatCard icon="table" label="Available Tables" value={`${stats?.availableTables ?? 0} / ${stats?.totalTables ?? 0}`} subValue="Tables ready for use" delay="80ms" iconColor="blue" />
                        <StatCard icon="calendar" label="Pending Bookings" value={stats?.pendingBookings ?? 0} subValue="Awaiting confirmation" delay="140ms" iconColor="amber" />
                        <StatCard icon="hourglass" label="Waitlist" value={stats?.waitlistCount ?? 0} subValue="Customers waiting" delay="200ms" iconColor="violet" />
                        <OccupancyBar occupied={stats?.occupiedTables ?? 0} total={stats?.totalTables ?? 0} />
                    </section>

                    {/* ── Quick Actions ── */}
                    <section className="mt-6 dashboard-rise" style={{ animationDelay: "300ms" }}>
                        <article className="rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="rounded-xl border border-red-500/15 bg-red-500/10 p-2.5 text-red-500"><Icon name="zap" className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Shortcuts</p>
                                    <h2 className="text-lg font-bold">Quick Actions</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                <QuickActionButton icon="gamepad" label="Start Game" onClick={() => setStartOpen(true)} color="violet" />
                                <QuickActionButton icon="calendar" label="View Bookings" onClick={() => navigate("/admin/bookings")} color="blue" />
                                <QuickActionButton icon="hourglass" label="View Waitlist" onClick={() => navigate("/admin/bookings")} color="amber" />
                            </div>
                        </article>
                    </section>

                    {/* ── Financial Stats ── */}
                    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:gap-4" aria-label="Financial statistics">
                        <StatCard icon="dollar" label="Today's Income" value={`Rs. ${(stats?.todayIncome ?? 0).toLocaleString()}`} subValue="Total received today" delay="380ms" iconColor="emerald" />
                        <StatCard icon="arrowDown" label="Today's Expenses" value={`Rs. ${(stats?.todayExpenses ?? 0).toLocaleString()}`} subValue="Total spent today" delay="420ms" iconColor="rose" />
                        <StatCard
                            icon={netProfit >= 0 ? "trendingUp" : "trendingDown"}
                            label="Net Profit"
                            value={`${netProfit < 0 ? "- " : ""}Rs. ${Math.abs(netProfit).toLocaleString()}`}
                            subValue={netProfit >= 0 ? "You're in profit today" : "Expenses exceed income"}
                            delay="460ms"
                            iconColor={netProfit >= 0 ? "emerald" : "rose"}
                        />
                    </section>

                    {/* ── Bottom Grid: Pending Actions + Activity Summary + Recent Activity ── */}
                    <section className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        {/* Pending Actions */}
                        <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "440ms" }}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="rounded-xl border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-500"><Icon name="alert" className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">Requires attention</p>
                                    <h2 className="text-lg font-bold">Pending Actions</h2>
                                </div>
                            </div>
                            <div>
                                <PendingRow label="Booking requests to review" count={stats?.pendingBookings ?? 0} />
                                <PendingRow label="Payment proofs to verify" count={stats?.unpaidBills ?? 0} />
                                <PendingRow label="Customers in waitlist" count={stats?.waitlistCount ?? 0} />
                                <PendingRow label="Upcoming tournaments" count={stats?.upcomingTournaments ?? 0} />
                            </div>
                            <p className="mt-4 text-[11px] text-neutral-600 flex items-center gap-1.5"><Icon name="clock" className="h-3 w-3" /> Live data from your branch</p>
                        </article>

                        {/* Activity Summary */}
                        <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "480ms" }}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-2.5 text-emerald-500"><Icon name="chart" className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Today</p>
                                    <h2 className="text-lg font-bold">Activity Summary</h2>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><Icon name="calendar" className="h-4 w-4" /></div>
                                        <div><p className="text-sm font-semibold text-neutral-200">Today&apos;s Bookings</p><p className="text-xs text-neutral-500">Confirmed games</p></div>
                                    </div>
                                    <span className="text-2xl font-black text-white">{stats?.todayBookings ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400"><Icon name="gamepad" className="h-4 w-4" /></div>
                                        <div><p className="text-sm font-semibold text-neutral-200">Active Games</p><p className="text-xs text-neutral-500">Currently in progress</p></div>
                                    </div>
                                    <span className="text-2xl font-black text-white">{stats?.activeGames ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><Icon name="trophy" className="h-4 w-4" /></div>
                                        <div><p className="text-sm font-semibold text-neutral-200">Upcoming Events</p><p className="text-xs text-neutral-500">Tournaments & specials</p></div>
                                    </div>
                                    <span className="text-2xl font-black text-white">{stats?.upcomingEvents ?? 0}</span>
                                </div>
                            </div>
                        </article>

                        {/* Recent Activity Feed */}
                        <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6 lg:col-span-2 xl:col-span-1" style={{ animationDelay: "520ms" }}>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="rounded-xl border border-blue-500/15 bg-blue-500/10 p-2.5 text-blue-500"><Icon name="activity" className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Live</p>
                                    <h2 className="text-lg font-bold">Recent Activity</h2>
                                </div>
                            </div>
                            {(stats?.recentActivity ?? []).length > 0 ? (
                                <div className="max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                                    {stats.recentActivity.map((item, i) => (
                                        <ActivityItem key={i} item={item} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 mb-3">
                                        <Icon name="activity" className="h-7 w-7 text-neutral-600" />
                                    </div>
                                    <p className="text-neutral-400 font-semibold text-sm">No recent activity</p>
                                    <p className="text-neutral-600 text-xs mt-1">Activity will appear here as it happens</p>
                                </div>
                            )}
                        </article>
                    </section>
                </>
            )}
        </AdminLayout>
    );
}
