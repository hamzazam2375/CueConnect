import { createContext, useContext } from "react";

// provided by NotificationsProvider inside ClientLayout; the bell in any page header reads it
export const NotificationsContext = createContext({
    notifications: [],
    unreadCount: 0,
    openNotification: () => {},
    markAllRead: () => {}
});

export const useNotifications = () => useContext(NotificationsContext);
