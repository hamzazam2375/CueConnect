import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { uploadPaymentProof } from "../middleware/upload.js";
import {
    listBookingBranches,
    listBranchTables,
    getBranchAvailability,
    listClientBookings,
    getClientBooking,
    getClientBookingProof,
    createClientBooking,
    cancelClientBooking,
    rescheduleClientBooking,
    changeClientBookingTable,
    listClientWaitlist,
    joinWaitlist,
    leaveWaitlist
} from "../controllers/clientBookingController.js";
import {
    listMembershipPlans,
    listClientMemberships,
    createClientMembership,
    cancelClientMembership,
    getClientMembershipProof
} from "../controllers/clientMembershipController.js";
import {
    getSocketToken,
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from "../controllers/clientNotificationController.js";
import { getClientLoyalty } from "../controllers/clientLoyaltyController.js";
import { getClientHistory } from "../controllers/clientHistoryController.js";
import {
    listClientEvents,
    getClientEvent,
    registerForEvent,
    listClientEventRegistrations,
    cancelEventRegistration,
    getEventRegistrationProof
} from "../controllers/clientEventController.js";

const router = express.Router();

router.use(protect, authorize("client"));

router.get("/branches", listBookingBranches);
router.get("/branches/:branchId/tables", listBranchTables);
router.get("/branches/:branchId/availability", getBranchAvailability);

router.get("/bookings", listClientBookings);
router.post("/bookings", uploadPaymentProof, createClientBooking);
router.get("/bookings/:reference", getClientBooking);
router.get("/bookings/:reference/payment-proof", getClientBookingProof);
router.patch("/bookings/:reference/cancel", cancelClientBooking);
router.patch("/bookings/:reference/reschedule", rescheduleClientBooking);
router.patch("/bookings/:reference/table", changeClientBookingTable);

router.get("/membership-plans", listMembershipPlans);
router.get("/memberships", listClientMemberships);
router.post("/memberships", uploadPaymentProof, createClientMembership);
router.patch("/memberships/:reference/cancel", cancelClientMembership);
router.get("/memberships/:reference/payment-proof", getClientMembershipProof);

router.get("/waitlist", listClientWaitlist);
router.post("/waitlist", joinWaitlist);
router.patch("/waitlist/:id/cancel", leaveWaitlist);

router.get("/loyalty", getClientLoyalty);
router.get("/history", getClientHistory);

router.get("/events", listClientEvents);
router.get("/events/:id", getClientEvent);
router.post("/events/:id/register", uploadPaymentProof, registerForEvent);
router.get("/event-registrations", listClientEventRegistrations);
router.patch("/event-registrations/:reference/cancel", cancelEventRegistration);
router.get("/event-registrations/:reference/payment-proof", getEventRegistrationProof);

router.get("/socket-token", getSocketToken);
router.get("/notifications", listNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
