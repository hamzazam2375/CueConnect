import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";
import Logo from "./Logo";

const sidebarItems = [
    { key: "dashboard", label: "Dashboard",           icon: "grid",     href: "/admin/dashboard" },
    { key: "tables",    label: "Table Management",    icon: "table",    href: "/admin/tables" },
    { key: "games",     label: "Games & Billing",     icon: "gamepad",  href: "/admin/games" },
    { key: "discounts", label: "Discounts & Loyalty",  icon: "tag",     href: "/admin/discounts" },
    { key: "bookings",  label: "Bookings & Events",   icon: "calendar", href: "/admin/bookings" },
    { key: "customers", label: "Customers",            icon: "users",   href: "/admin/customers" },
    { key: "finance",   label: "Finance & Reports",    icon: "chart",   href: "/admin/finance" },
    { key: "settings",  label: "Settings",             icon: "settings", href: "/admin/settings" },
];

const implementedKeys = ["dashboard", "tables"];

export function Icon({ name, className = "h-5 w-5" }) {
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
        plus: <path d="M12 5v14M5 12h14" />,
        edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
        trash: <><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
        x: <path d="M18 6L6 18M6 6l12 12" />,
        check: <path d="M20 6L9 17l-5-5" />,
        search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
    };
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

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
            {!active && !implementedKeys.includes(item.key) && (
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Soon</span>
            )}
        </Link>
    );
}

export default function AdminLayout({ title, children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading } = useSelector((state) => state.auth);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const initials = `${user?.firstName?.[0] || "A"}${user?.lastName?.[0] || ""}`.toUpperCase();
    const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const activeKey = sidebarItems.find((item) => location.pathname.startsWith(item.href))?.key || "dashboard";

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate("/admin/login", { replace: true });
        } catch { /* redux error */ }
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-[16%] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-red-700/[0.08] blur-[130px]" />
                <div className="absolute bottom-[-16rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" />
            </div>

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] border-r border-white/[0.07] bg-black/95 px-5 py-6 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between">
                    <Link to="/" className="px-2" aria-label="Home"><Logo blend={false} className="h-8 contrast-125 brightness-110" /></Link>
                    <button type="button" onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-neutral-400 hover:text-white p-1" aria-label="Close menu">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">Management</div>
                <nav className="mt-3 space-y-1.5" aria-label="Admin navigation">
                    {sidebarItems.map((item) => <SideNavItem key={item.key} item={item} active={activeKey === item.key} />)}
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

            <div className="relative lg:pl-[272px]">
                <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050505]/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-4 sm:px-7 lg:px-10">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-neutral-400 hover:text-white p-2 -ml-2" aria-label="Open menu">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                            <Link to="/" className="lg:hidden" aria-label="Home"><Logo blend={false} className="h-7 contrast-125 brightness-110" /></Link>
                            <div className="hidden lg:block">
                                <p className="text-xs text-neutral-500">{dateLabel}</p>
                                <p className="mt-0.5 text-sm font-semibold text-neutral-200">{title || "Admin Dashboard"}</p>
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
                    <nav className="dashboard-mobile-nav flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Mobile admin navigation">
                        {sidebarItems.slice(0, 5).map((item) => (
                            <Link key={item.key} to={item.href} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium ${activeKey === item.key ? "bg-red-600 text-white" : "border border-white/[0.08] bg-white/[0.03] text-neutral-400"}`}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </header>

                <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
                    {children}
                    <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>Goodshot Snooker Club · CueConnect Admin</p>
                        <p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Secure admin session</p>
                    </footer>
                </main>
            </div>
        </div>
    );
}
