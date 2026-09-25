import { Router } from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  setPaymentStatus,
  markInstallmentPaid,
  analytics,
} from "../controllers/booking.controller.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";

const router = Router();

// Must come before the /:id routes below.
router.get("/analytics", requireStaff, analytics);

router.get("/", requireStaff, listBookings);
router.get("/:id", requireAuth, getBooking);
router.post("/:propertyId", requireAuth, createBooking);
router.patch("/:id/accept", requireStaff, acceptBooking);
router.patch("/:id/reject", requireStaff, rejectBooking);
router.patch("/:id/cancel", requireStaff, cancelBooking);
router.patch("/:id/payment-status", requireStaff, setPaymentStatus);
router.patch("/:id/installments/:installmentId", requireStaff, markInstallmentPaid);

export default router;
