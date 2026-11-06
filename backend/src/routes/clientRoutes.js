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

router.get("/socket-token", getSocketToken);
router.get("/notifications", listNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
