import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";
import api from "../services/api";
import Logo from "../components/Logo";

// ── sidebar navigation items ──

const sidebarItems = [
    { key: "dashboard", label: "Dashboard",          icon: "grid",     href: "/admin/dashboard" },
    { key: "tables",    label: "Table Management",   icon: "table",    href: "/admin/tables" },
    { key: "games",     label: "Games & Billing",    icon: "gamepad",  href: "/admin/games" },
    { key: "discounts", label: "Discounts & Loyalty", icon: "tag",     href: "/admin/discounts" },
    { key: "bookings",  label: "Bookings & Events",  icon: "calendar", href: "/admin/bookings" },
    { key: "customers", label: "Customers",           icon: "users",   href: "/admin/customers" },
    { key: "finance",   label: "Finance & Reports",   icon: "chart",   href: "/admin/finance" },
    { key: "settings",  label: "Settings",            icon: "settings", href: "/admin/settings" },
];

// ── SVG icon map ──

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
        table: <><path d="M3 9h18M3 15h18" /><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
        gamepad: <><path d="M6 11h4M8 9v4" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" /></>,
        tag: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /><path d="m9 15 2 2 4-5" /></>,
        users: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
        chart: <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
        settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /></>,
        bell: <><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
        arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
        dollar: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
        clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
        alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></>,
        trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H3v2a4 4 0 004 4M17 6h4v2a4 4 0 01-4 4" /></>,
        file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
        chevronDown: <path d="M6 9l6 6 6-6" />,
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

// ── sidebar nav item ──

function SideNavItem({ item, active }) {
    const classes = `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-300 ${
        active
            ? "bg-red-600 text-white shadow-lg shadow-red-950/40"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
    }`;

    return (
        <Link to={item.href} className={classes}>
            <Icon name={item.icon} className={`h-[18px] w-[18px] transition-transform duration-300 ${active ? "" : "group-hover:scale-110"}`} />
            <span>{item.label}</span>
            {!active && item.key !== "dashboard" && (
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Soon</span>
            )}
        </Link>
    );
}

// ── stat card ──

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

// ── pending action row ──

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

// ── main component ──

export default function AdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading, error } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const initials = `${user?.firstName?.[0] || "A"}${user?.lastName?.[0] || ""}`.toUpperCase();
    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
    const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    useEffect(() => {
        api.get("/admin/dashboard-stats")
            .then(({ data }) => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate("/admin/login", { replace: true });
        } catch {
            // Redux displays the error
        }
    };

    // determine active sidebar key from path
    const activeKey = sidebarItems.find((item) => location.pathname.startsWith(item.href))?.key || "dashboard";

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            {/* background glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-[16%] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-red-700/[0.08] blur-[130px]" />
                <div className="absolute bottom-[-16rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" />
            </div>

            {/* mobile overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* ── SIDEBAR ── */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] border-r border-white/[0.07] bg-black/95 px-5 py-6 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 flex flex-col ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}>
                <div className="flex items-center justify-between">
                    <Link to="/" className="px-2" aria-label="Home">
                        <Logo blend={false} className="h-8 contrast-125 brightness-110" />
                    </Link>
                    <button type="button" onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-neutral-400 hover:text-white p-1" aria-label="Close menu">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">Management</div>
                <nav className="mt-3 space-y-1.5" aria-label="Admin dashboard navigation">
                    {sidebarItems.map((item) => (
                        <SideNavItem key={item.key} item={item} active={activeKey === item.key} />
                    ))}
                </nav>

                <div className="mt-auto">
                    <div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-sm font-black shadow-lg shadow-red-950/50">{initials}</div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                                <p className="truncate text-xs text-neutral-500">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={handleLogout} disabled={isLoading} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed">
                        <Icon name="logout" className="h-[18px] w-[18px]" />
                        {isLoading ? "Signing out..." : "Sign out"}
                    </button>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <div className="relative lg:pl-[272px]">
                {/* header */}
                <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050505]/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-4 sm:px-7 lg:px-10">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-neutral-400 hover:text-white p-2 -ml-2" aria-label="Open menu">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <Link to="/" className="lg:hidden" aria-label="Home"><Logo blend={false} className="h-7 contrast-125 brightness-110" /></Link>
                            <div className="hidden lg:block">
                                <p className="text-xs text-neutral-500">{dateLabel}</p>
                                <p className="mt-0.5 text-sm font-semibold text-neutral-200">Admin Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-neutral-400 transition-all hover:border-white/15 hover:bg-white/[0.07] hover:text-white" aria-label="Notifications">
                                <Icon name="bell" className="h-[18px] w-[18px]" />
                                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-black" />
                            </button>
                            <Link to="/" className="hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white sm:block">Back to website</Link>
                            <button type="button" onClick={handleLogout} disabled={isLoading} className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 lg:hidden" aria-label="Sign out">
                                <Icon name="logout" className="h-[18px] w-[18px]" />
                            </button>
                        </div>
                    </div>
                    {/* mobile nav pills */}
                    <nav className="dashboard-mobile-nav flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Mobile admin navigation">
                        {sidebarItems.slice(0, 5).map((item) => (
                            <Link
                                key={item.key}
                                to={item.href}
                                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium ${
                                    activeKey === item.key
                                        ? "bg-red-600 text-white"
                                        : "border border-white/[0.08] bg-white/[0.03] text-neutral-400"
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </header>

                {/* ── page content ── */}
                <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
                    {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</div>}

                    {/* greeting */}
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

                    {/* loading state */}
                    {statsLoading ? (
                        <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-[140px] rounded-2xl border border-white/[0.07] bg-neutral-950/80 animate-pulse" />
                            ))}
                        </section>
                    ) : (
                        <>
                            {/* stat cards */}
                            <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Branch statistics">
                                <StatCard
                                    icon="table"
                                    label="Available Tables"
                                    value={`${stats?.availableTables ?? 0} / ${stats?.totalTables ?? 0}`}
                                    subValue="Tables ready for use"
                                    delay="80ms"
                                />
                                <StatCard
                                    icon="calendar"
                                    label="Pending Bookings"
                                    value={stats?.pendingBookings ?? 0}
                                    subValue="Awaiting confirmation"
                                    delay="140ms"
                                />
                                <StatCard
                                    icon="dollar"
                                    label="Today's Income"
                                    value={`Rs. ${(stats?.todayIncome ?? 0).toLocaleString()}`}
                                    subValue="Total received today"
                                    delay="200ms"
                                />
                                <StatCard
                                    icon="file"
                                    label="Unpaid Bills"
                                    value={stats?.unpaidBills ?? 0}
                                    subValue="Pending payments"
                                    delay="260ms"
                                />
                            </section>

                            {/* pending actions + today's activity */}
                            <section className="mt-6 grid gap-6 xl:grid-cols-2">
                                {/* pending actions */}
                                <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "320ms" }}>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="rounded-xl border border-amber-500/15 bg-amber-500/10 p-2.5 text-amber-500">
                                            <Icon name="alert" className="h-5 w-5" />
                                        </div>
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
                                    <p className="mt-4 text-[11px] text-neutral-600 flex items-center gap-1.5">
                                        <Icon name="clock" className="h-3 w-3" />
                                        Live data from your branch
                                    </p>
                                </article>

                                {/* today's activity */}
                                <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "380ms" }}>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/10 p-2.5 text-emerald-500">
                                            <Icon name="chart" className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Today</p>
                                            <h2 className="text-lg font-bold">Activity Summary</h2>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                                                    <Icon name="calendar" className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-neutral-200">Today&apos;s Bookings</p>
                                                    <p className="text-xs text-neutral-500">Confirmed games</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-white">{stats?.todayBookings ?? 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
                                                    <Icon name="gamepad" className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-neutral-200">Active Games</p>
                                                    <p className="text-xs text-neutral-500">Currently in progress</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-white">{stats?.activeGames ?? 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                                                    <Icon name="trophy" className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-neutral-200">Upcoming Events</p>
                                                    <p className="text-xs text-neutral-500">Tournaments & specials</p>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-black text-white">{stats?.upcomingEvents ?? 0}</span>
                                        </div>
                                    </div>
                                </article>
                            </section>
                        </>
                    )}

                    <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>Goodshot Snooker Club · CueConnect Admin</p>
                        <p className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Secure admin session
                        </p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
