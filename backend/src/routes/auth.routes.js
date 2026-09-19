import { Router } from "express";
import { sendSignupOtp, register, login, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);

export const otpRouter = Router();
otpRouter.post("/send-otp", sendSignupOtp);

export default router;
