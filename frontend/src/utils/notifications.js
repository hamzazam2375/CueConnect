import api from "../services/api";

// resolves to { notifications, unreadCount }
export const fetchNotifications = async (basePath = "/client") => {
    const { data } = await api.get(`${basePath}/notifications`);
    return data;
};

export const markNotificationRead = async (id, basePath = "/client") => {
    const { data } = await api.patch(`${basePath}/notifications/${encodeURIComponent(id)}/read`);
    return data.notification;
};

export const markAllNotificationsRead = (basePath = "/client") => api.patch(`${basePath}/notifications/read-all`);
