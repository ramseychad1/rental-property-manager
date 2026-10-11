import { COOKIE_NAME, verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { fail } from "../lib/response.js";
import { isStaff, isSuperAdmin, isSiteAdmin } from "../lib/access.js";

const SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { memberships: true } });
    if (user && user.isActive && (await applyAccessContext(req, user))) {
      req.user = user;
      // Throttled so a busy page doesn't write on every request.
      if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
        user.lastSeenAt = new Date();
        prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: user.lastSeenAt } }).catch(() => {});
      }
    }
  } catch {
    // ignore invalid/expired token - request proceeds unauthenticated
  }

  next();
}

// Works out which complex this request acts on and the user's role there,
// storing both on `user` (`membership`, `siteId`). Returns false when the
// user has no standing here, in which case the request is treated as signed
// out:
//  - On a complex's own domain, only members of *that* complex (and
//    SuperAdmin) are signed in.
//  - On any other host (the admin panel), a member acts in their complex.
//  - SuperAdmin acts on every complex (siteId null) unless a domain or the
//    X-Site-Id header narrows it to one.
async function applyAccessContext(req, user) {
  const memberships = user.memberships ?? [];
  const onComplexDomain = !!req.siteMatched;

  if (user.role === "SuperAdmin") {
    let siteId = onComplexDomain ? req.site.id : null;
    const picked = req.get("x-site-id");
    if (!onComplexDomain && picked) {
      const site = await prisma.site.findUnique({ where: { id: picked } });
      if (site) {
        siteId = site.id;
        req.site = site;
      }
    }
    user.membership = null;
    user.siteId = siteId;
    return true;
  }

  const membership = onComplexDomain ? memberships.find((m) => m.siteId === req.site.id) : memberships[0];
  if (!membership) return false;

  user.membership = membership;
  user.siteId = membership.siteId;
  if (req.site?.id !== membership.siteId) {
    req.site = await prisma.site.findUnique({ where: { id: membership.siteId } });
  }
  return true;
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

// Runs a complex: SiteAdmin of it, or SuperAdmin.
export function requireSiteAdmin(req, res, next) {
  if (!req.user) return fail(res, "Please sign in to continue.", 401);
  if (!isSuperAdmin(req.user) && !isSiteAdmin(req.user)) return fail(res, "Site admin access required.", 403);
  next();
}

// Accounts created or reset by a SuperAdmin carry a temporary password. Until
// it's changed, only the calls needed to change it (and browse the public
// site) are allowed.
const PASSWORD_CHANGE_ALLOWED = new Set(["GET /user", "POST /user/logout", "PATCH /user/updatePassword"]);
const PUBLIC_GET_PREFIXES = ["/property", "/season", "/site-content", "/media", "/health", "/invite/preview"];

export function enforcePasswordChange(req, res, next) {
  if (!req.user?.mustChangePassword) return next();
  const path = req.path.replace(/\/+$/, "") || "/";
  if (PASSWORD_CHANGE_ALLOWED.has(`${req.method} ${path}`)) return next();
  if (req.method === "GET" && PUBLIC_GET_PREFIXES.some((p) => path.startsWith(p))) return next();
  return fail(res, "Please change your temporary password to continue.", 403, { code: "PASSWORD_CHANGE_REQUIRED" });
}
