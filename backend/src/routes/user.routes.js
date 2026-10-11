import { Router } from "express";
import {
  me,
  logout,
  updateProfile,
  updatePassword,
  listAllUsers,
  userBookings,
  createUser,
  updateUser,
  resetUserPassword,
  emailCredentials,
  deleteUser,
} from "../controllers/user.controller.js";
import { requireAuth, requireSiteAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", requireAuth, me);
router.post("/logout", logout);
router.post("/updateProfile", requireAuth, upload.single("picture"), updateProfile);
router.patch("/updatePassword", requireAuth, updatePassword);
router.get("/all-users", requireSiteAdmin, listAllUsers);
router.post("/", requireSiteAdmin, createUser);
router.patch("/:userId", requireSiteAdmin, updateUser);
router.delete("/:userId", requireSiteAdmin, deleteUser);
router.post("/:userId/reset-password", requireSiteAdmin, resetUserPassword);
router.post("/:userId/email-credentials", requireSiteAdmin, emailCredentials);
router.get("/:userId/bookings", requireAuth, userBookings);

export default router;
