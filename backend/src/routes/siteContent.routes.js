import { Router } from "express";
import {
  getSiteContent,
  saveSection,
  resetSection,
  uploadImage,
} from "../controllers/siteContent.controller.js";
import { requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getSiteContent);
router.post("/upload", requireAdmin, upload.single("image"), uploadImage);
router.put("/:section", requireAdmin, saveSection);
router.delete("/:section", requireAdmin, resetSection);

export default router;
