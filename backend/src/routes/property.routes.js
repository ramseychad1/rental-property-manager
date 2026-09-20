import { Router } from "express";
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  removeProperty,
  bookedDates,
  bookedRanges,
  pricingPreview,
  checkAvailability,
} from "../controllers/property.controller.js";
import { requireStaff } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

const propertyUpload = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 20 },
]);

router.get("/", listProperties);
router.get("/:id", getProperty);
router.get("/:id/booked-dates", bookedDates);
router.get("/:id/booked-ranges", requireStaff, bookedRanges);
router.get("/:id/pricing", pricingPreview);
router.get("/:id/check-availability", requireStaff, checkAvailability);
router.post("/", requireStaff, propertyUpload, createProperty);
router.patch("/:id", requireStaff, propertyUpload, updateProperty);
router.delete("/:id", requireStaff, removeProperty);

export default router;
