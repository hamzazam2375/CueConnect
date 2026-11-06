import mongoose from "mongoose";
import Notification from "../models/notification.js";
import { serializeNotification } from "../services/notifications.js";
import { createSocketToken } from "../services/realtime.js";

const LIST_LIMIT = 30;

// short-lived token the browser uses to open the real-time connection
export const getSocketToken = (req, res) => {
    res.status(200).json({ token: createSocketToken(req.user._id) });
};

export const listNotifications = async (req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(LIST_LIMIT),
            Notification.countDocuments({ user: req.user._id, isRead: false })
        ]);
        res.status(200).json({ notifications: notifications.map(serializeNotification), unreadCount });
    } catch (error) {
        console.error("List notifications error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const notification = mongoose.Types.ObjectId.isValid(req.params.id)
            ? await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { isRead: true } }, { returnDocument: "after" })
            : null;
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ notification: serializeNotification(notification) });
    } catch (error) {
        console.error("Mark notification read error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
        res.status(200).json({ unreadCount: 0 });
    } catch (error) {
        console.error("Mark all notifications read error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
