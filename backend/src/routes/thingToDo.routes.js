import { Router } from "express";
import {
  listThingsToDo,
  getThingToDo,
  createThingToDo,
  updateThingToDo,
  removeThingToDo,
} from "../controllers/thingToDo.controller.js";
import { requireSiteAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", listThingsToDo);
router.get("/:id", getThingToDo);
router.post("/", requireSiteAdmin, upload.single("image"), createThingToDo);
router.patch("/:id", requireSiteAdmin, upload.single("image"), updateThingToDo);
router.delete("/:id", requireSiteAdmin, removeThingToDo);

export default router;
