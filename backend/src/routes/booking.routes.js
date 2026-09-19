import { Router } from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  setPaymentStatus,
  analytics,
} from "../controllers/booking.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Must come before the /:id routes below.
router.get("/analytics", requireAdmin, analytics);

router.get("/", requireAdmin, listBookings);
router.get("/:id", requireAuth, getBooking);
router.post("/:propertyId", requireAuth, createBooking);
router.patch("/:id/accept", requireAdmin, acceptBooking);
router.patch("/:id/reject", requireAdmin, rejectBooking);
router.patch("/:id/cancel", requireAdmin, cancelBooking);
router.patch("/:id/payment-status", requireAdmin, setPaymentStatus);

export default router;
