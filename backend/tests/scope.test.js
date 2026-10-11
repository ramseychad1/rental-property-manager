// Scope editor + last-Super-Admin guard. Local database only.
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) throw new Error("scope tests only run against a local database.");

const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
const { invalidateSiteCache } = await import("../src/lib/siteResolver.js");

const PASSWORD = "Test1234!";
const EMAIL = (k) => `xs-${k}@example.com`.toLowerCase();
let server, base;
const jars = {};
const U = {};
const S = {};

async function api(method, path, { as, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (as && jars[as]) headers.Cookie = jars[as];
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { status: res.status, body: json };
}

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "xs-" } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.property.deleteMany({ where: { OR: [{ ownerId: { in: ids } }, { site: { slug: { startsWith: "xs-" } } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.site.deleteMany({ where: { slug: { startsWith: "xs-" } } });
  invalidateSiteCache();
}

const mk = async (key, role, site) =>
  (U[key] = await prisma.user.create({
    data: {
      name: key,
      email: EMAIL(key),
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role,
      isVerified: true,
      ...(site && role !== "SuperAdmin" ? { memberships: { create: { siteId: site.id, role } } } : {}),
    },
  }));

before(async () => {
  await cleanup();
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  S.a = await prisma.site.create({ data: { slug: "xs-a", name: "XS A" } });
  S.b = await prisma.site.create({ data: { slug: "xs-b", name: "XS B" } });
  await mk("super1", "SuperAdmin");
  await mk("ownerA", "Owner", S.a);
  await mk("guest", "Guest", S.a);
  for (const k of ["super1", "ownerA"]) {
    const r = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL(k), password: PASSWORD }),
    });
    jars[k] = r.headers.get("set-cookie").split(";")[0];
  }
});

after(async () => {
  server?.close();
  await cleanup();
  await prisma.$disconnect();
});

const scope = (key, body, as = "super1") => api("PATCH", `/api/user/${U[key].id}/scope`, { as, body });
const membership = (key) => prisma.siteMembership.findMany({ where: { userId: U[key].id } });

test("only a super admin can use the scope editor", async () => {
  assert.equal((await scope("ownerA", { role: "SiteAdmin", siteId: S.a.id }, "ownerA")).status, 403);
  assert.equal((await api("PATCH", `/api/user/${U.ownerA.id}/scope`, { body: { role: "Owner", siteId: S.a.id } })).status, 401);
});

test("promote an owner to site admin, then move them to another complex", async () => {
  assert.equal((await scope("ownerA", { role: "SiteAdmin", siteId: S.a.id })).status, 200);
  let m = await membership("ownerA");
  assert.equal(m.length, 1);
  assert.deepEqual([m[0].role, m[0].siteId], ["SiteAdmin", S.a.id]);
  assert.equal((await prisma.user.findUnique({ where: { id: U.ownerA.id } })).role, "SiteAdmin");

  assert.equal((await scope("ownerA", { role: "Owner", siteId: S.b.id })).status, 200);
  m = await membership("ownerA");
  assert.equal(m.length, 1, "never more than one membership");
  assert.deepEqual([m[0].role, m[0].siteId], ["Owner", S.b.id]);
});

test("validation and refusals", async () => {
  assert.equal((await scope("ownerA", { role: "Owner" })).status, 400, "complex required");
  assert.equal((await scope("ownerA", { role: "Owner", siteId: "nope" })).status, 400);
  assert.equal((await scope("guest", { role: "Owner", siteId: S.a.id })).status, 400, "guests can't be promoted here");
  assert.equal((await scope("super1", { role: "Owner", siteId: S.a.id })).status, 400, "not your own account");

  // an owner's properties pin them to their complex
  await prisma.property.create({ data: { title: "xs-prop", siteId: S.b.id, ownerId: U.ownerA.id } });
  assert.equal((await scope("ownerA", { role: "Owner", siteId: S.a.id })).status, 409);
  assert.equal((await scope("ownerA", { role: "SiteAdmin", siteId: S.b.id })).status, 200, "same complex is fine");
});

test("role changes no longer go through the generic update", async () => {
  assert.equal((await api("PATCH", `/api/user/${U.ownerA.id}`, { as: "super1", body: { role: "Owner" } })).status, 400);
  assert.equal((await api("PATCH", `/api/user/${U.ownerA.id}`, { as: "super1", body: { name: "Renamed" } })).status, 200);
});

test("super admins can't remove each other into an empty platform, even at the same moment", async () => {
  // Park every other active super admin so exactly super1 and super2 count.
  const active = await prisma.user.findMany({ where: { role: "SuperAdmin", isActive: true }, select: { id: true } });
  const parked = active.filter((u) => ![U.super1.id].includes(u.id)).map((u) => u.id);
  await prisma.user.updateMany({ where: { id: { in: parked } }, data: { isActive: false } });
  try {
    await mk("super2", "SuperAdmin");
    const login = async (k) => {
      const r = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL(k), password: PASSWORD }),
      });
      jars[k] = r.headers.get("set-cookie").split(";")[0];
    };
    await login("super2");

    // Each tries to demote the other simultaneously: exactly one may win.
    const [a, b] = await Promise.all([
      scope("super2", { role: "Owner", siteId: S.a.id }, "super1"),
      scope("super1", { role: "Owner", siteId: S.a.id }, "super2"),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const left = await prisma.user.count({ where: { id: { in: [U.super1.id, U.super2.id] }, role: "SuperAdmin", isActive: true } });
    assert.equal(left, 1, "one super admin always remains");
  } finally {
    await prisma.user.updateMany({ where: { id: { in: parked } }, data: { isActive: true } });
  }
});
