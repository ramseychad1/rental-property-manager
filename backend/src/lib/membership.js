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

// Keeps a user's membership in step with User.role. The app allows one
// membership per user for now (the multi-complex switcher will lift this), so
// this replaces whatever is there.
// A user who already belongs to a complex stays in it; otherwise `siteId`, else
// the default complex.
export async function syncMembership(client, userId, role, siteId) {
  const existing = await client.siteMembership.findFirst({ where: { userId } });
  const targetSiteId = existing?.siteId ?? siteId ?? (await getDefaultSite(client)).id;
  await client.siteMembership.deleteMany({ where: { userId } });
  if (role !== "SuperAdmin") {
    await client.siteMembership.create({ data: { userId, siteId: targetSiteId, role } });
  }
}
