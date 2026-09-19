import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { ok, fail, ApiError } from "../lib/response.js";
import { serializeUser } from "../lib/serialize.js";
import { signToken, COOKIE_NAME, cookieOptions } from "../lib/jwt.js";
import { issueCode, verifyCode } from "../lib/otp.js";

const emailSchema = z.string().trim().email();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z.string().trim().length(6, "Enter the 6-digit code"),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

function setSession(res, user) {
  const token = signToken({ sub: user.id });
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export async function sendSignupOtp(req, res, next) {
  try {
    const email = emailSchema.parse(req.body.email);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new ApiError("An account with this email already exists.", 409);

    await issueCode(email, "SIGNUP");
    return ok(res, null, "OTP sent successfully");
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, otp, phone } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new ApiError("An account with this email already exists.", 409);

    const valid = await verifyCode(email, "SIGNUP", otp);
    if (!valid) throw new ApiError("Invalid or expired OTP.", 400);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone: phone || null,
        isVerified: true,
      },
    });

    setSession(res, user);

    // Note: this endpoint's response shape intentionally differs from the
    // rest of the API (top-level `user`, not `data`) - the frontend's
    // AuthContext.signup() destructures `data.user` directly.
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new ApiError("Invalid email or password.", 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError("Invalid email or password.", 401);

    setSession(res, user);
    return ok(res, serializeUser(user), "Login successful");
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = emailSchema.parse(req.body.email);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always respond success even if no account exists, to avoid leaking
    // which emails are registered.
    if (user) await issueCode(email, "PASSWORD_RESET");

    return ok(res, null, "If that email exists, a reset code has been sent.");
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const schema = z.object({
      email: emailSchema,
      token: z.string().trim().length(6, "Enter the 6-digit code"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });
    const { email, token, password } = schema.parse(req.body);

    const valid = await verifyCode(email, "PASSWORD_RESET", token);
    if (!valid) throw new ApiError("Invalid or expired code.", 400);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash },
    });

    return ok(res, serializeUser(user), "Password reset successfully");
  } catch (err) {
    next(err);
  }
}
