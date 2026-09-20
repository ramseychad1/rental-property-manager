import { Router } from "express";
import { status, startGoogle, googleCallback, sendTest, disconnect } from "../controllers/email.controller.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/status", requireStaff, status);
router.post("/google/start", requireStaff, startGoogle);
router.get("/google/callback", googleCallback); // authorized by signed `state`
router.post("/test", requireStaff, sendTest);
router.delete("/connection", requireStaff, disconnect);

export default router;
