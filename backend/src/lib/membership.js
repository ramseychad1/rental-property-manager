import { prisma } from "./prisma.js";

// Single-complex for now: everything hangs off one "default" site row.
export function getDefaultSite(client = prisma) {
  return client.site.upsert({ where: { slug: "default" }, update: {}, create: { slug: "default" } });
}

// Nested-create fragment for `prisma.user.create({ data: { ..., ...membershipCreate(site, role) } })`.
// SuperAdmin is platform-level and has no membership.
export function membershipCreate(site, role) {
  if (role === "SuperAdmin") return {};
  return { memberships: { create: { siteId: site.id, role } } };
}

// Gives a user exactly this role in exactly this complex (the app allows one
// membership per user for now, so any other is dropped). SuperAdmin is
// platform-level and has none.
export async function replaceMembership(client, userId, role, siteId) {
  await client.siteMembership.deleteMany({ where: { userId } });
  if (role !== "SuperAdmin") {
    await client.siteMembership.create({ data: { userId, siteId, role } });
  }
}
