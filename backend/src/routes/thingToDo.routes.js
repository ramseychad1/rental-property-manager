import { Router } from "express";
import {
  listThingsToDo,
  getThingToDo,
  createThingToDo,
  updateThingToDo,
  removeThingToDo,
} from "../controllers/thingToDo.controller.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", listThingsToDo);
router.get("/:id", getThingToDo);
router.post("/", requireSuperAdmin, upload.single("image"), createThingToDo);
router.patch("/:id", requireSuperAdmin, upload.single("image"), updateThingToDo);
router.delete("/:id", requireSuperAdmin, removeThingToDo);

export default router;
