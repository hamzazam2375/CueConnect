import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
    listBookingBranches,
    listBranchTables,
    getBranchAvailability,
    listClientBookings,
    getClientBooking,
    createClientBooking,
    cancelClientBooking,
    rescheduleClientBooking,
    changeClientBookingTable
} from "../controllers/clientBookingController.js";

const router = express.Router();

router.use(protect, authorize("client"));

router.get("/branches", listBookingBranches);
router.get("/branches/:branchId/tables", listBranchTables);
router.get("/branches/:branchId/availability", getBranchAvailability);

router.get("/bookings", listClientBookings);
router.post("/bookings", createClientBooking);
router.get("/bookings/:reference", getClientBooking);
router.patch("/bookings/:reference/cancel", cancelClientBooking);
router.patch("/bookings/:reference/reschedule", rescheduleClientBooking);
router.patch("/bookings/:reference/table", changeClientBookingTable);

export default router;
