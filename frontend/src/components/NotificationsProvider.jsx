import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationsContext } from "./notificationsContext";
import { connectRealtime } from "../services/realtime";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../utils/notifications";

const LIST_LIMIT = 30;
const TOAST_MS = 7000;

// loads the client's notifications, keeps a real-time connection for new ones, and shows them as toasts
export default function NotificationsProvider({ children, basePath = "/client" }) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

    useEffect(() => {
        let active = true;
        const load = () => fetchNotifications(basePath)
            .then((data) => {
                if (!active) return;
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            })
            .catch(() => {});

        load();
        const socket = connectRealtime(`${basePath}/socket-token`);
        // a reconnect may have missed notifications, so reload the list
        socket.io.on("reconnect", load);
        socket.on("notification", (notification) => {
            setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, LIST_LIMIT));
            setUnreadCount((count) => count + 1);
            setToasts((current) => [...current, notification]);
            setTimeout(() => dismissToast(notification.id), TOAST_MS);
        });

        return () => {
            active = false;
            socket.disconnect();
        };
    }, [basePath, dismissToast]);

    const openNotification = useCallback((notification) => {
        dismissToast(notification.id);
        if (!notification.isRead) {
            setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item));
            setUnreadCount((count) => Math.max(count - 1, 0));
            markNotificationRead(notification.id, basePath).catch(() => {});
        }
        if (notification.link) navigate(notification.link);
    }, [basePath, dismissToast, navigate]);

    const markAllRead = useCallback(() => {
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
        markAllNotificationsRead(basePath).catch(() => {});
    }, [basePath]);

    const value = useMemo(() => ({ notifications, unreadCount, openNotification, markAllRead }), [notifications, unreadCount, openNotification, markAllRead]);

    return (
        <NotificationsContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed bottom-4 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3" style={{ left: "1rem", right: "auto" }} aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className="dashboard-rise pointer-events-auto flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-[#0b0b0b]/95 p-4 text-white shadow-2xl shadow-black backdrop-blur-xl" role="status">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        <button type="button" onClick={() => openNotification(toast)} className="min-w-0 flex-1 text-left"><p className="text-sm font-bold">{toast.title}</p><p className="mt-1 text-xs leading-relaxed text-neutral-400">{toast.message}</p></button>
                        <button type="button" onClick={() => dismissToast(toast.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Dismiss notification"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                    </div>
                ))}
            </div>
        </NotificationsContext.Provider>
    );
}
