import { Router } from "express";
import { listSeasons, createSeason, updateSeason, removeSeason } from "../controllers/season.controller.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/:propertyId", listSeasons);
router.post("/:propertyId", requireStaff, createSeason);
router.patch("/:seasonId/:propertyId", requireStaff, updateSeason);
router.delete("/:seasonId/:propertyId", requireStaff, removeSeason);

export default router;
