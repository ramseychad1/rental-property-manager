import { Router } from "express";
import { me, logout, updateProfile, updatePassword, listAllUsers, userBookings } from "../controllers/user.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", requireAuth, me);
router.post("/logout", logout);
router.post("/updateProfile", requireAuth, upload.single("picture"), updateProfile);
router.patch("/updatePassword", requireAuth, updatePassword);
router.get("/all-users", requireAdmin, listAllUsers);
router.get("/:userId/bookings", requireAuth, userBookings);

export default router;
