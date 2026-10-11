import { Router } from "express";
import {
  currentSite,
  listSites,
  createSite,
  updateSite,
  addDomain,
  makePrimary,
  removeDomain,
  checkDomain,
} from "../controllers/site.controller.js";
import { requireSuperAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/current", currentSite);

// Complexes and their domains are platform-level: SuperAdmin only.
router.get("/", requireSuperAdmin, listSites);
router.post("/", requireSuperAdmin, createSite);
router.patch("/:id", requireSuperAdmin, updateSite);
router.post("/:id/domains", requireSuperAdmin, addDomain);
router.patch("/:id/domains/:domainId/primary", requireSuperAdmin, makePrimary);
router.delete("/:id/domains/:domainId", requireSuperAdmin, removeDomain);
router.post("/:id/domains/:domainId/check", requireSuperAdmin, checkDomain);

export default router;
