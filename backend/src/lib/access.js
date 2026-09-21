import { ApiError } from "./response.js";
import { prisma } from "./prisma.js";

// Roles: SuperAdmin (platform operator, sees everything), Owner (manages only
// the properties whose ownerId is theirs), Guest (public site customer).

export const isSuperAdmin = (u) => u?.role === "SuperAdmin";
export const isStaff = (u) => u?.role === "SuperAdmin" || u?.role === "Owner";

// Prisma `where` fragment limiting properties to what `u` may manage.
export const propertyScope = (u) => (isSuperAdmin(u) ? {} : { ownerId: u.id });

// Same, for bookings (scoped through their property).
export const bookingScope = (u) => (isSuperAdmin(u) ? {} : { property: { ownerId: u.id } });

// Loads a property the user may manage, or 404s (404 rather than 403 so ids
// belonging to other owners aren't confirmed to exist).
export async function findManagedProperty(user, id) {
  const property = await prisma.property.findFirst({ where: { id, ...propertyScope(user) } });
  if (!property) throw new ApiError("Property not found.", 404);
  return property;
}

// --- Private properties -----------------------------------------------------
// A private property is visible to its owner, a SuperAdmin, and any guest with
// an active OwnerGrant from that owner. Public properties are visible to all.

// `where` fragment for a property list on the public site (active only).
export const visiblePropertyWhere = (u) => {
  if (isSuperAdmin(u)) return { status: "active" };
  const or = [{ isPrivate: false }];
  if (u) {
    or.push({ ownerId: u.id });
    or.push({ isPrivate: true, owner: { grantsGiven: { some: { guestUserId: u.id, revokedAt: null } } } });
  }
  return { status: "active", OR: or };
};

export async function canViewProperty(user, property) {
  if (!property) return false;
  const manages = isSuperAdmin(user) || (user && property.ownerId === user.id);
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
export async function findViewableProperty(user, id) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!(await canViewProperty(user, property))) throw new ApiError("Property not found.", 404);
  return property;
}
