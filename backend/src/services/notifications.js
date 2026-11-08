import Notification from "../models/notification.js";
import User from "../models/user.js";
import { emitToUser } from "./realtime.js";

export const serializeNotification = (notification) => ({
    id: String(notification._id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    isRead: notification.isRead,
    createdAt: notification.createdAt
});

// stores the notification and pushes it to the user's open tabs
export const notifyUser = async ({ user, branchId, type, title, message, link = null }) => {
    const notification = await Notification.create({ user, branchId, type, title, message, link });
    emitToUser(user, "notification", serializeNotification(notification));
    return notification;
};

export const notifyBranchAdmins = async ({ branchId, type, title, message, link = null }) => {
    const admins = await User.find({ role: "admin", branchId }).select("_id");
    await Promise.all(admins.map((admin) => notifyUser({ user: admin._id, branchId, type, title, message, link })));
};
