import { Router } from "express";
import authRoutes, { otpRouter } from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import propertyRoutes from "./property.routes.js";
import seasonRoutes from "./season.routes.js";
import bookingRoutes from "./booking.routes.js";
import contactRoutes from "./contact.routes.js";
import mediaRoutes from "./media.routes.js";
import siteContentRoutes from "./siteContent.routes.js";
import emailRoutes from "./email.routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

router.use("/auth", authRoutes);
router.use("/otp", otpRouter);
router.use("/user", userRoutes);
router.use("/property", propertyRoutes);
router.use("/season", seasonRoutes);
router.use("/booking", bookingRoutes);
router.use("/contact", contactRoutes);
router.use("/media", mediaRoutes);
router.use("/site-content", siteContentRoutes);
router.use("/email", emailRoutes);

export default router;
