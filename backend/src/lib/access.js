import { ApiError } from "./response.js";
import { prisma } from "./prisma.js";

// Roles: SuperAdmin (platform operator, all complexes), SiteAdmin (runs one
// complex), Owner (manages only the properties whose ownerId is theirs), Guest
// (public site customer). SuperAdmin lives on User.role; the others are the
// user's SiteMembership role, attached to req.user by attachUser along with
// `siteId`: the complex the request acts on (null = all, SuperAdmin only).

export const isSuperAdmin = (u) => u?.role === "SuperAdmin";
export const isSiteAdmin = (u) => u?.membership?.role === "SiteAdmin";
export const isStaff = (u) => isSuperAdmin(u) || ["Owner", "SiteAdmin"].includes(u?.membership?.role);

// The complex a request is for: the signed-in user's, else the resolved host's.
export const reqSiteId = (req) => (req.user ? req.user.siteId : (req.site?.id ?? null));

// Content writes must name one complex. A Super Admin working on "All
// complexes" has no target, so refuse instead of silently editing the default
// (with a single complex there's nothing to confuse, so that case is allowed).
export async function requireTargetSite(req) {
  if (!isSuperAdmin(req.user) || req.user.siteId) return;
  if ((await prisma.site.count()) > 1) throw new ApiError("Pick a complex first (top bar) before editing.", 400);
}

const siteWhere = (u) => (u?.siteId ? { siteId: u.siteId } : {});

// Prisma `where` fragment limiting properties a user may *see* in the admin
// panel: SiteAdmin sees every property in their complex.
export const propertyScope = (u) => {
  if (isSuperAdmin(u)) return siteWhere(u);
  if (isSiteAdmin(u)) return { siteId: u.siteId };
  return { siteId: u.siteId, ownerId: u.id };
};

// ...and the narrower set they may *change*: a SiteAdmin edits only properties
// they own; booking decisions and payments belong to the property's owner.
export const propertyManageScope = (u) => (isSuperAdmin(u) ? siteWhere(u) : { siteId: u.siteId, ownerId: u.id });

const viaProperty = (property) => (Object.keys(property).length ? { property } : {});

// Same, for bookings (scoped through their property).
export const bookingScope = (u) => viaProperty(propertyScope(u));
export const bookingManageScope = (u) => viaProperty(propertyManageScope(u));

// Does `u` see / change this loaded property (or a booking's property)?
export const canSeeManagedProperty = (u, property) => {
  if (!u || !property) return false;
  if (isSuperAdmin(u)) return !u.siteId || property.siteId === u.siteId;
  if (property.siteId !== u.siteId) return false;
  return isSiteAdmin(u) || (isStaff(u) && property.ownerId === u.id);
};
export const canManageProperty = (u, property) => {
  if (!u || !property) return false;
  if (isSuperAdmin(u)) return !u.siteId || property.siteId === u.siteId;
  return isStaff(u) && property.siteId === u.siteId && property.ownerId === u.id;
};

// Loads a property the user may manage, or 404s (404 rather than 403 so ids
// belonging to other owners aren't confirmed to exist).
export async function findManagedProperty(user, id) {
  const property = await prisma.property.findFirst({ where: { id, ...propertyManageScope(user) } });
  if (!property) throw new ApiError("Property not found.", 404);
  return property;
}

// --- Private properties -----------------------------------------------------
// A private property is visible to its owner, a SuperAdmin, and any guest with
// an active OwnerGrant from that owner. Public properties are visible to all.

// `where` fragment for a property list on the public site (active only).
export const visiblePropertyWhere = (u, siteId) => {
  const base = { status: "active", ...(siteId ? { siteId } : {}) };
  if (isSuperAdmin(u)) return base;
  const or = [{ isPrivate: false }];
  if (u) {
    or.push({ ownerId: u.id });
    or.push({ isPrivate: true, owner: { grantsGiven: { some: { guestUserId: u.id, revokedAt: null } } } });
  }
  return { ...base, OR: or };
};

export async function canViewProperty(user, property, siteId) {
  if (!property) return false;
  if (siteId && property.siteId !== siteId) return false;
  const manages = isSuperAdmin(user) || isSiteAdmin(user) || (user && property.ownerId === user.id);
  if (manages) return true;
  if (property.status !== "active") return false;
  if (!property.isPrivate) return true;
  if (!user || !property.ownerId) return false;
  const grant = await prisma.ownerGrant.findFirst({
    where: { ownerId: property.ownerId, guestUserId: user.id, revokedAt: null },
    select: { id: true },
  });
  return !!grant;
}

// Loads a property the user may see on the public site, or 404s. Inactive and
// inaccessible-private properties look identical to nonexistent ones.
export async function findViewableProperty(user, id, siteId) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!(await canViewProperty(user, property, siteId))) throw new ApiError("Property not found.", 404);
  return property;
}
