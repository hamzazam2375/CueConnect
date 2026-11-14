import express from "express";
import mongoose from "mongoose";
import { protect, authorize } from "../middleware/auth.js";
import { getDashboardStats } from "../controllers/adminDashboardController.js";
import { listTables, createTable, updateTable, deleteTable } from "../controllers/adminTableController.js";
import {
    listActiveGames,
    listGameHistory,
    getGame,
    startGame,
    stopGame
} from "../controllers/adminGameController.js";
import {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer
} from "../controllers/adminCustomerController.js";
import {
    listBills,
    getBill,
    applyBillDiscount,
    recordBillPayment,
    downloadBillReceipt,
    redeemBillReward
} from "../controllers/adminBillingController.js";
import {
    getFinanceOverview,
    listFinanceIncome,
    listFinanceExpenses,
    createExpense,
    deleteExpense,
    previewFinanceReport,
    downloadFinanceReport
} from "../controllers/adminFinanceController.js";
import {
    getSettings,
    updateBranchSettings,
    addPaymentAccount,
    updatePaymentAccount,
    deletePaymentAccount,
    updateAdminProfile,
    updateAdminPassword
} from "../controllers/adminSettingsController.js";
import {
    listAdminBookings,
    createAdminBooking,
    editAdminBooking,
    updateAdminBooking,
    getAdminBookingProof,
    listAdminEvents,
    createAdminEvent,
    updateAdminEvent,
    updateAdminEventStatus,
    archiveAdminEvent,
    deleteAdminEvent,
    listAdminEventRegistrations,
    updateAdminEventRegistration,
    getAdminEventRegistrationProof,
    listAdminWaitlist,
    notifyWaitlistCustomer
} from "../controllers/adminBookingEventController.js";
import {
    getSocketToken,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from "../controllers/clientNotificationController.js";

const router = express.Router();

// every admin route needs a signed-in admin; controllers scope data to req.user.branchId
router.use(protect, authorize("admin"));

// a malformed id can never match a document, so answer 404 instead of letting Mongoose throw
const requireObjectId = (req, res, next, value) => (
    mongoose.Types.ObjectId.isValid(value) ? next() : res.status(404).json({ message: "Not found" })
);
router.param("id", requireObjectId);
router.param("accountId", requireObjectId);

// dashboard
router.get("/dashboard-stats", getDashboardStats);

// tables
router.get("/tables", listTables);
router.post("/tables", createTable);
router.put("/tables/:id", updateTable);
router.delete("/tables/:id", deleteTable);

// games
router.get("/games/active", listActiveGames);
router.get("/games/history", listGameHistory);
router.post("/games", startGame);
router.get("/games/:id", getGame);
router.patch("/games/:id/stop", stopGame);

// billing
router.get("/bills", listBills);
router.get("/bills/:id/receipt", downloadBillReceipt);
router.get("/bills/:id", getBill);
router.patch("/bills/:id/discount", applyBillDiscount);
router.post("/bills/:id/payments", recordBillPayment);
router.post("/bills/:id/loyalty-reward", redeemBillReward);

// customers
router.get("/customers", listCustomers);
router.post("/customers", createCustomer);
router.get("/customers/:id", getCustomer);
router.patch("/customers/:id", updateCustomer);

// bookings & waitlist
router.get("/bookings", listAdminBookings);
router.post("/bookings", createAdminBooking);
router.patch("/bookings/:id/edit", editAdminBooking);
router.patch("/bookings/:id", updateAdminBooking);
router.get("/bookings/:id/payment-proof", getAdminBookingProof);
router.get("/waitlist", listAdminWaitlist);
router.patch("/waitlist/:id/notify", notifyWaitlistCustomer);

// events & registrations
router.get("/events", listAdminEvents);
router.post("/events", createAdminEvent);
router.patch("/events/:id", updateAdminEvent);
router.patch("/events/:id/status", updateAdminEventStatus);
router.patch("/events/:id/archive", archiveAdminEvent);
router.delete("/events/:id", deleteAdminEvent);
router.get("/events/:id/registrations", listAdminEventRegistrations);
router.patch("/event-registrations/:id", updateAdminEventRegistration);
router.get("/event-registrations/:id/payment-proof", getAdminEventRegistrationProof);

// finance
router.get("/finance", getFinanceOverview);
router.get("/finance/income", listFinanceIncome);
router.get("/finance/expenses", listFinanceExpenses);
router.get("/finance/report", previewFinanceReport);
router.get("/finance/report-pdf", downloadFinanceReport);
router.post("/expenses", createExpense);
router.delete("/expenses/:id", deleteExpense);

// notifications
router.get("/socket-token", getSocketToken);
router.get("/notifications", listNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

// settings
router.get("/settings", getSettings);
router.patch("/settings/branch", updateBranchSettings);
router.post("/settings/accounts", addPaymentAccount);
router.patch("/settings/accounts/:accountId", updatePaymentAccount);
router.delete("/settings/accounts/:accountId", deletePaymentAccount);
router.patch("/settings/profile", updateAdminProfile);
router.patch("/settings/password", updateAdminPassword);

export default router;
