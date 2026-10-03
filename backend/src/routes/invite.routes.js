import { Router } from "express";
import {
  createInvite,
  resendInvite,
  listInvites,
  revokeInvite,
  previewInvite,
  claimInvite,
  listGrants,
  revokeGrant,
} from "../controllers/invite.controller.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";

const router = Router();

// Invitee-facing (any signed-in guest, or nobody for the preview).
router.get("/preview/:token", previewInvite);
router.post("/claim", requireAuth, claimInvite);

// Owner-facing.
router.get("/grants", requireStaff, listGrants);
router.delete("/grants/:id", requireStaff, revokeGrant);
router.get("/", requireStaff, listInvites);
router.post("/", requireStaff, createInvite);
router.post("/:id/resend", requireStaff, resendInvite);
router.delete("/:id", requireStaff, revokeInvite);

export default router;
