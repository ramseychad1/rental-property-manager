import { Router } from "express";
import { listSeasons, createSeason, updateSeason, removeSeason } from "../controllers/season.controller.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/:propertyId", listSeasons);
router.post("/:propertyId", requireAdmin, createSeason);
router.patch("/:seasonId/:propertyId", requireAdmin, updateSeason);
router.delete("/:seasonId/:propertyId", requireAdmin, removeSeason);

export default router;
