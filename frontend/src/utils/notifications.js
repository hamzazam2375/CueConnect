import api from "../services/api";

// resolves to { notifications, unreadCount }
export const fetchNotifications = async () => {
    const { data } = await api.get("/client/notifications");
    return data;
};

export const markNotificationRead = async (id) => {
    const { data } = await api.patch(`/client/notifications/${encodeURIComponent(id)}/read`);
    return data.notification;
};

export const markAllNotificationsRead = () => api.patch("/client/notifications/read-all");
