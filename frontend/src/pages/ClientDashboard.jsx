import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import branches from "../data/branches";
import { logout } from "../store/authSlice";
import tableImage from "../../assets/table.jpg";
import { getBookingsForUser } from "../utils/clientBookings";

const navigation = [
    { label: "Overview", icon: "grid", active: true },
    { label: "Book a table", icon: "calendar", href: "/client/book" },
    { label: "My bookings", icon: "ticket", href: "/client/bookings" },
    { label: "Membership", icon: "crown", href: "/#membership" },
    { label: "Loyalty points", icon: "star" },
    { label: "Events", icon: "trophy", href: "/#events" }
];

const quickActions = [
    { title: "Book a table", description: "Reserve your preferred slot", icon: "calendar", href: "/client/book", accent: "red" },
    { title: "Explore events", description: "Tournaments and club nights", icon: "trophy", href: "/#events", accent: "amber" },
    { title: "Memberships", description: "Unlock discounts and perks", icon: "crown", href: "/#membership", accent: "violet" },
    { title: "My bookings", description: "Review your booking requests", icon: "history", href: "/client/bookings", accent: "blue" }
];

const allEvents = branches
    .flatMap((branch) => branch.events.map((event) => ({ ...event, branchName: branch.name })))
    .sort((first, second) => new Date(first.date) - new Date(second.date));

const availableTables = branches.reduce(
    (total, branch) => total + branch.tables.filter((table) => table.status === "available").length,
    0
);

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
        calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="17" rx="3" /><path d="m9 15 2 2 4-5" /></>,
        ticket: <><path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" /><path d="M13 5v2M13 11v2M13 17v2" /></>,
        crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5z" /><path d="M5 21h14" /></>,
        star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1z" />,
        trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H3v2a4 4 0 0 0 4 4M17 6h4v2a4 4 0 0 1-4 4" /></>,
        history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
        arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
        pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
        spark: <><path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2z" /><path d="m5 15-.6 2.4L2 18l2.4.6L5 21l.6-2.4L8 18l-2.4-.6z" /></>
    };

    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

function SideNavItem({ item }) {
    const classes = `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-300 ${
        item.active
            ? "bg-red-600 text-white shadow-lg shadow-red-950/40"
            : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
    }`;

    const content = (
        <>
            <Icon name={item.icon} className={`h-[18px] w-[18px] transition-transform duration-300 ${item.active ? "" : "group-hover:scale-110"}`} />
            <span>{item.label}</span>
            {!item.href && !item.active && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-neutral-600">Soon</span>}
        </>
    );

    return item.href ? <a href={item.href} className={classes}>{content}</a> : <div className={classes}>{content}</div>;
}

function StatCard({ icon, label, value, detail, delay }) {
    return (
        <article className="dashboard-rise dashboard-card group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-neutral-950/80 p-5" style={{ animationDelay: delay }}>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-600/[0.07] blur-2xl transition-all duration-500 group-hover:bg-red-600/15" />
            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">{label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
                    <p className="mt-1 text-xs text-neutral-500">{detail}</p>
                </div>
                <div className="rounded-xl border border-red-500/15 bg-red-500/10 p-2.5 text-red-500 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                    <Icon name={icon} />
                </div>
            </div>
        </article>
    );
}

export default function ClientDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isLoading, error } = useSelector((state) => state.auth);
    const bookings = getBookingsForUser(user);
    const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
    const initials = `${user.firstName?.[0] || "C"}${user.lastName?.[0] || ""}`.toUpperCase();
    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
    const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            navigate("/login", { replace: true });
        } catch {
            // Redux displays the API error in the dashboard.
        }
    };

    return (
        <div className="dashboard-shell min-h-screen bg-[#050505] text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-[16%] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-red-700/[0.08] blur-[130px]" />
                <div className="absolute bottom-[-16rem] right-[-8rem] h-[34rem] w-[34rem] rounded-full bg-red-950/20 blur-[150px]" />
            </div>

            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/[0.07] bg-black/80 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
                <Link to="/" className="px-2" aria-label="Goodshot home">
                    <Logo blend={false} className="h-8 contrast-125 brightness-110" />
                </Link>

                <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">Your space</div>
                <nav className="mt-3 space-y-1.5" aria-label="Client dashboard navigation">
                    {navigation.map((item) => <SideNavItem key={item.label} item={item} />)}
                </nav>

                <div className="mt-auto">
                    <div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-red-800 text-sm font-black shadow-lg shadow-red-950/50">{initials}</div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
                                <p className="truncate text-xs text-neutral-500">{user.email}</p>
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
                        <Link to="/" className="lg:hidden" aria-label="Goodshot home"><Logo blend={false} className="h-7 contrast-125 brightness-110" /></Link>
                        <div className="hidden lg:block">
                            <p className="text-xs text-neutral-500">{dateLabel}</p>
                            <p className="mt-0.5 text-sm font-semibold text-neutral-200">Client dashboard</p>
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
                    <nav className="dashboard-mobile-nav flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Mobile dashboard navigation">
                        {navigation.slice(0, 4).map((item) => item.href ? (
                            <a key={item.label} href={item.href} className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-neutral-400">{item.label}</a>
                        ) : (
                            <span key={item.label} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium ${item.active ? "bg-red-600 text-white" : "border border-white/[0.08] bg-white/[0.03] text-neutral-500"}`}>{item.label}</span>
                        ))}
                    </nav>
                </header>

                <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
                    {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">{error}</div>}

                    <section className="dashboard-rise flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                                <Icon name="spark" className="h-3.5 w-3.5" /> Ready for your next frame
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl xl:text-5xl">{greeting}, <span className="text-red-500">{user.firstName}</span>.</h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500 sm:text-base">Everything you need for your next game, all in one place.</p>
                        </div>
                        <Link to="/client/book" className="group inline-flex w-fit items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold shadow-lg shadow-red-950/40 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-red-900/50">
                            Book a table <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </section>

                    <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4" aria-label="Account overview">
                        <StatCard icon="calendar" label="Bookings" value={bookings.length} detail={pendingBookings ? `${pendingBookings} pending request${pendingBookings === 1 ? "" : "s"}` : "No pending requests"} delay="80ms" />
                        <StatCard icon="star" label="Loyalty points" value="0" detail="Play to earn points" delay="140ms" />
                        <StatCard icon="crown" label="Membership" value="Basic" detail="Explore premium plans" delay="200ms" />
                        <StatCard icon="ticket" label="Tables ready" value={availableTables} detail={`Across ${branches.length} branches`} delay="260ms" />
                    </section>

                    <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,0.75fr)]">
                        <div className="space-y-6">
                            <article className="dashboard-rise dashboard-card relative min-h-[285px] overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950" style={{ animationDelay: "300ms" }}>
                                <img src={tableImage} alt="Premium snooker table" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-1000 hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/15" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="relative flex min-h-[285px] max-w-xl flex-col justify-center p-6 sm:p-9">
                                    <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">{availableTables} tables available now</span>
                                    <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Your table is waiting.</h2>
                                    <p className="mt-3 text-sm leading-relaxed text-neutral-400">Choose a branch, pick a table, and get ready for your next great game.</p>
                                    <Link to="/client/book" className="group mt-6 inline-flex w-fit items-center gap-2 text-sm font-bold text-white">
                                        Check availability <span className="grid h-8 w-8 place-items-center rounded-full bg-red-600 transition-transform duration-300 group-hover:translate-x-1"><Icon name="arrow" className="h-4 w-4" /></span>
                                    </Link>
                                </div>
                            </article>

                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Get started</p><h2 className="mt-1 text-xl font-bold">Quick actions</h2></div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {quickActions.map((action, index) => {
                                        const actionClass = "dashboard-rise dashboard-card group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-neutral-950/70 p-4 text-left";
                                        const content = <><span className={`quick-icon quick-icon-${action.accent}`}><Icon name={action.icon} /></span><span><span className="block text-sm font-bold text-neutral-100 transition-colors group-hover:text-white">{action.title}</span><span className="mt-1 block text-xs text-neutral-500">{action.description}</span></span><Icon name="arrow" className="ml-auto h-4 w-4 text-neutral-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-red-500" /></>;
                                        return action.href ? <a key={action.title} href={action.href} className={actionClass} style={{ animationDelay: `${360 + index * 60}ms` }}>{content}</a> : <div key={action.title} className={actionClass} style={{ animationDelay: `${360 + index * 60}ms` }}>{content}</div>;
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <article className="dashboard-rise dashboard-card overflow-hidden rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "360ms" }}>
                                <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Your status</p><h2 className="mt-1 text-xl font-bold">Cue Club Basic</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 text-neutral-300"><Icon name="crown" /></span></div>
                                <div className="mt-7 flex items-end justify-between"><div><p className="text-3xl font-black">0 <span className="text-sm font-medium text-neutral-500">points</span></p><p className="mt-1 text-xs text-neutral-500">500 points to Silver</p></div><span className="text-xs font-bold text-neutral-400">0%</span></div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="dashboard-progress h-full w-[4%] rounded-full bg-gradient-to-r from-red-700 to-red-500" /></div>
                                <a href="/#membership" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white">Explore membership plans <Icon name="arrow" className="h-3.5 w-3.5" /></a>
                            </article>

                            <article className="dashboard-rise dashboard-card rounded-3xl border border-white/[0.08] bg-neutral-950/85 p-6" style={{ animationDelay: "440ms" }}>
                                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Coming up</p><h2 className="mt-1 text-xl font-bold">Club events</h2></div><a href="/#events" className="text-xs font-semibold text-neutral-500 transition-colors hover:text-red-400">View all</a></div>
                                <div className="mt-5 space-y-3">
                                    {allEvents.slice(0, 3).map((event) => {
                                        const date = new Date(`${event.date}T12:00:00`);
                                        return <a href="/#events" key={`${event.branchName}-${event.title}`} className="group flex gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-white/[0.06] hover:bg-white/[0.025]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-500/10 text-center"><span><span className="block text-[9px] font-bold uppercase tracking-wider text-red-400">{date.toLocaleString("en", { month: "short" })}</span><span className="block text-lg font-black leading-none">{date.getDate()}</span></span></span><span className="min-w-0 py-0.5"><span className="block truncate text-sm font-bold text-neutral-200 transition-colors group-hover:text-white">{event.title}</span><span className="mt-1 flex items-center gap-1 truncate text-[11px] text-neutral-500"><Icon name="pin" className="h-3 w-3" /> {event.branchName.replace("GOODSHOT ", "")}</span></span></a>;
                                    })}
                                </div>
                            </article>
                        </div>
                    </section>

                    <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between"><p>Goodshot Snooker Club · CueConnect</p><p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Account protected with a secure session</p></footer>
                </main>
            </div>
        </div>
    );
}
