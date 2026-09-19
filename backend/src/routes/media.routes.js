import { Router } from "express";
import { serveMedia } from "../controllers/media.controller.js";

const router = Router();

router.get("/:key", serveMedia);

export default router;
