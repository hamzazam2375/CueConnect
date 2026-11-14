import { useEffect, useRef, useState } from "react";
import { useNotifications } from "./notificationsContext";

const timeAgo = (value) => {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// `align` is the side of the bell the panel lines up with: "left" when the bell sits on the left of a header
// (client pages), "right" when it sits on the right (admin header), so the panel always opens toward the page
export default function NotificationBell({ align = "left" }) {
    const { notifications, unreadCount, openNotification, markAllRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // close on outside click or Escape
    useEffect(() => {
        if (!isOpen) return undefined;
        const closeOnOutside = (event) => !containerRef.current?.contains(event.target) && setIsOpen(false);
        const closeOnEscape = (event) => event.key === "Escape" && setIsOpen(false);
        document.addEventListener("mousedown", closeOnOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen]);

    const open = (notification) => {
        setIsOpen(false);
        openNotification(notification);
    };

    return (
        <div ref={containerRef} className="relative">
            <button type="button" onClick={() => setIsOpen((value) => !value)} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-neutral-300 transition-all hover:border-white/15 hover:bg-white/[0.07] hover:text-white" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={isOpen}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-lg shadow-red-950">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {isOpen && (
                // phones: pinned inside the viewport under the header; wider screens: dropped down from the bell
                <div className={`fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b0b0b] text-white shadow-2xl shadow-black sm:absolute sm:inset-x-auto sm:top-12 sm:w-[360px] ${align === "right" ? "sm:right-0" : "sm:left-0"}`} role="dialog" aria-label="Notifications">
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><p className="text-sm font-bold">Notifications</p>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-[11px] font-bold text-neutral-500 transition-colors hover:text-red-400">Mark all read</button>}</div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length ? notifications.map((notification) => (
                            <button key={notification.id} type="button" onClick={() => open(notification)} className={`flex w-full items-start gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.04] ${notification.isRead ? "" : "bg-red-500/[0.04]"}`}>
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-transparent" : "bg-red-500"}`} />
                                <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-neutral-200">{notification.title}</span><span className="mt-1 block text-[11px] leading-relaxed text-neutral-500">{notification.message}</span><span className="mt-1.5 block text-[10px] text-neutral-700">{timeAgo(notification.createdAt)}</span></span>
                            </button>
                        )) : <p className="px-4 py-10 text-center text-xs text-neutral-600">No notifications yet.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
