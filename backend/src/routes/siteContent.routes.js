import { Router } from "express";
import {
  getSiteContent,
  saveSection,
  resetSection,
  uploadImage,
} from "../controllers/siteContent.controller.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getSiteContent);
router.post("/upload", requireSuperAdmin, upload.single("image"), uploadImage);
router.put("/:section", requireSuperAdmin, saveSection);
router.delete("/:section", requireSuperAdmin, resetSection);

export default router;
