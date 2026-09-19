import { Router } from "express";
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  removeProperty,
  bookedDates,
  pricingPreview,
  checkAvailability,
} from "../controllers/property.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

const propertyUpload = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 20 },
]);

router.get("/", listProperties);
router.get("/:id", getProperty);
router.get("/:id/booked-dates", bookedDates);
router.get("/:id/pricing", pricingPreview);
router.get("/:id/check-availability", requireAdmin, checkAvailability);
router.post("/", requireAdmin, propertyUpload, createProperty);
router.patch("/:id", requireAdmin, propertyUpload, updateProperty);
router.delete("/:id", requireAdmin, removeProperty);

export default router;
