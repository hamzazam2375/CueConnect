import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { SidebarContext } from "./sidebarContext";
import { logout } from "../store/authSlice";

// `match` is the path prefix that keeps an item highlighted on its sub-pages
const navigation = [
    { label: "Overview", icon: "grid", href: "/client/dashboard", match: "/client/dashboard" },
    { label: "Profile", icon: "user", href: "/client/profile", match: "/client/profile" },
    { label: "Book a table", icon: "calendar", href: "/client/book", match: "/client/book" },
    { label: "My bookings", icon: "ticket", href: "/client/bookings", match: "/client/bookings" },
    { label: "My membership", icon: "crown", href: "/client/memberships/manage", match: "/client/memberships" },
    { label: "Loyalty points", icon: "star" },
    { label: "Events", icon: "trophy", href: "/#events", external: true }
];

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /><path d="m9 15 2 2 4-5" /></>,
        ticket: <><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z" />,
        trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
        close: <path d="M18 6 6 18M6 6l12 12" />
    };

    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

// matched by whole path segment, so "/client/book" does not light up on "/client/bookings"
const isItemActive = (item, pathname) => Boolean(item.match) && (pathname === item.match || pathname.startsWith(`${item.match}/`));

function SideNavItem({ item, active, onNavigate }) {
    const classes = `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-300 ${
        active
            ? "bg-red-600 text-white shadow-lg shadow-red-950/40"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
    }`;

    const content = (
        <>
            <Icon name={item.icon} className={`h-[18px] w-[18px] transition-transform duration-300 ${active ? "" : "group-hover:scale-110"}`} />
            <span>{item.label}</span>
            {!item.href && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Soon</span>}
        </>
    );

    if (!item.href) return <div className={classes}>{content}</div>;
    if (item.external) return <a href={item.href} className={classes}>{content}</a>;
    return <Link to={item.href} onClick={onNavigate} className={classes} aria-current={active ? "page" : undefined}>{content}</Link>;
}

export default function ClientLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, isLoading } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    const closeSidebar = () => setIsOpen(false);

    // while the drawer is open: Escape closes it and the page behind does not scroll
    useEffect(() => {
        if (!isOpen) return undefined;
        const closeOnEscape = (event) => event.key === "Escape" && setIsOpen(false);
        const previousOverflow = document.body.style.overflow;
        document.addEventListener("keydown", closeOnEscape);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate("/login", { replace: true });
        } catch {
            // the dashboard shows the auth error from Redux
        }
    };

    return (
        <SidebarContext.Provider value={{ isOpen, openSidebar: () => setIsOpen(true) }}>
            <Outlet />

            <div
                className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <aside
                id="client-sidebar"
                className={`fixed inset-y-0 left-0 z-[80] flex w-[272px] max-w-[85vw] flex-col border-r border-white/[0.07] bg-[#070707] px-5 py-6 text-white shadow-2xl shadow-black transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
                role="dialog"
                aria-modal="true"
                aria-label="Client menu"
                inert={!isOpen}
            >
                <div className="flex items-center justify-between gap-3">
                    <Link to="/" onClick={closeSidebar} className="px-2" aria-label="Goodshot home">
                        <Logo blend={false} className="h-8 contrast-125 brightness-110" />
                    </Link>
                    <button type="button" onClick={closeSidebar} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-white" aria-label="Close menu">
                        <Icon name="close" className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">Your space</div>
                <nav className="mt-3 space-y-1.5 overflow-y-auto" aria-label="Client navigation">
                    {navigation.map((item) => <SideNavItem key={item.label} item={item} active={isItemActive(item, pathname)} onNavigate={closeSidebar} />)}
                </nav>

                <div className="mt-auto pt-6">
                    <Link to="/client/profile" onClick={closeSidebar} className="mb-3 block rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-colors hover:border-red-500/20 hover:bg-red-500/[0.05]">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-sm font-black shadow-lg shadow-red-950/50">{initials}</div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
                                <p className="truncate text-xs text-neutral-500">{user.email}</p>
                            </div>
                        </div>
                    </Link>
                    <button type="button" onClick={handleLogout} disabled={isLoading} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed">
                        <Icon name="logout" className="h-[18px] w-[18px]" />
                        {isLoading ? "Signing out..." : "Sign out"}
                    </button>
                </div>
            </aside>
        </SidebarContext.Provider>
    );
}
