import { COOKIE_NAME, verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { fail } from "../lib/response.js";
import { isStaff, isSuperAdmin } from "../lib/access.js";

export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.isActive) req.user = user;
  } catch {
    // ignore invalid/expired token - request proceeds unauthenticated
  }

  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  next();
}

export function requireStaff(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  if (!isStaff(req.user)) return fail(res, "Admin access required.", 403);
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  if (!isSuperAdmin(req.user)) return fail(res, "Super admin access required.", 403);
  next();
}

// Accounts created or reset by a SuperAdmin carry a temporary password. Until
// it's changed, only the calls needed to change it (and browse the public
// site) are allowed.
const PASSWORD_CHANGE_ALLOWED = new Set(["GET /user", "POST /user/logout", "PATCH /user/updatePassword"]);
const PUBLIC_GET_PREFIXES = ["/property", "/season", "/site-content", "/media", "/health"];

export function enforcePasswordChange(req, res, next) {
  if (!req.user?.mustChangePassword) return next();
  const path = req.path.replace(/\/+$/, "") || "/";
  if (PASSWORD_CHANGE_ALLOWED.has(`${req.method} ${path}`)) return next();
  if (req.method === "GET" && PUBLIC_GET_PREFIXES.some((p) => path.startsWith(p))) return next();
  return fail(res, "Please change your temporary password to continue.", 403, { code: "PASSWORD_CHANGE_REQUIRED" });
}
