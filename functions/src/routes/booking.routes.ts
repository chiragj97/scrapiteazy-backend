import express from "express";
import {
  schedulePickup,
  getCustomerBookings,
  updateBookingStatus,
  cancelBooking,
  rateBooking,
} from "../controllers/customer/booking";

const router = express.Router();

// Customer booking routes
router.post("/schedule", schedulePickup);
router.get("/customer/:customerId", getCustomerBookings);
router.post("/status", updateBookingStatus);
router.post("/cancel", cancelBooking);
router.post("/rate", rateBooking);

export default router;
