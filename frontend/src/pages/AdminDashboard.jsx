import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import AdminLayout, { Icon } from "../components/AdminLayout";
import api from "../services/api";

function StatCard({ icon, label, value, subValue, delay }) {
    return (
        <article className="dashboard-rise dashboard-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: delay }}>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-600/[0.07] blur-2xl transition-all duration-500 group-hover:bg-red-600/15" />
            <div className="relative">
                <div className="flex items-center justify-between">
                    <div className="rounded-xl border border-red-500/15 bg-red-500/10 p-2.5 text-red-500 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
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

export default function AdminDashboard() {
    const { user, error } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

    useEffect(() => {
        api.get("/admin/dashboard-stats")
            .then(({ data }) => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    return (
        <AdminLayout title="Admin Dashboard">
            {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</div>}

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
                <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-[140px] rounded-2xl border border-white/[0.07] bg-neutral-950/80 animate-pulse" />
                    ))}
                </section>
            ) : (
                <>
                    <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Branch statistics">
                        <StatCard icon="table" label="Available Tables" value={`${stats?.availableTables ?? 0} / ${stats?.totalTables ?? 0}`} subValue="Tables ready for use" delay="80ms" />
                        <StatCard icon="calendar" label="Pending Bookings" value={stats?.pendingBookings ?? 0} subValue="Awaiting confirmation" delay="140ms" />
                        <StatCard icon="dollar" label="Today's Income" value={`Rs. ${(stats?.todayIncome ?? 0).toLocaleString()}`} subValue="Total received today" delay="200ms" />
                        <StatCard icon="file" label="Unpaid Bills" value={stats?.unpaidBills ?? 0} subValue="Pending payments" delay="260ms" />
                    </section>

                    <section className="mt-6 grid gap-6 xl:grid-cols-2">
                        <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "320ms" }}>
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
                                <PendingRow label="Upcoming tournaments" count={stats?.upcomingTournaments ?? 0} />
                            </div>
                            <p className="mt-4 text-[11px] text-neutral-600 flex items-center gap-1.5"><Icon name="clock" className="h-3 w-3" /> Live data from your branch</p>
                        </article>

                        <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "380ms" }}>
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
                    </section>
                </>
            )}
        </AdminLayout>
    );
}
