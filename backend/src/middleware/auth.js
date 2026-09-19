import { COOKIE_NAME, verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { fail } from "../lib/response.js";

export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) req.user = user;
  } catch {
    // ignore invalid/expired token - request proceeds unauthenticated
  }

  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  if (req.user.role !== "Admin") return fail(res, "Admin access required.", 403);
  next();
}
