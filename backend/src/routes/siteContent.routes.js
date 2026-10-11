import { Router } from "express";
import {
  getSiteContent,
  saveSection,
  resetSection,
  uploadImage,
} from "../controllers/siteContent.controller.js";
import { requireSiteAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getSiteContent);
router.post("/upload", requireSiteAdmin, upload.single("image"), uploadImage);
router.put("/:section", requireSiteAdmin, saveSection);
router.delete("/:section", requireSiteAdmin, resetSection);

export default router;
