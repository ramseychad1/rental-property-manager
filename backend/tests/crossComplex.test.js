// Cross-complex isolation tests. Runs against the LOCAL dev database: it
// creates two throwaway complexes (slugs "xt-a"/"xt-b") with users, properties,
// bookings and Things To Do, then checks that nothing leaks between them.
// Refuses to run against a non-local database.
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) {
  throw new Error("crossComplex tests only run against a local database.");
}

const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
const { invalidateSiteCache } = await import("../src/lib/siteResolver.js");

const PASSWORD = "Test1234!";
const ADMIN_CLIENT = "rental-property-manager-admin-panel";
const HOST = { a: "xt-a.test", b: "xt-b.test" };
const EMAIL = (k) => `xt-${k}@example.com`.toLowerCase();

let server, base;
const S = {}; // sites
const U = {}; // users keyed "ownerA"
const P = {}; // properties
const B = {}; // bookings
const T = {}; // things to do
const jars = {};

async function api(method, path, { as, host, admin, body, siteId } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (host) headers["X-Site-Host"] = host;
  if (admin) headers["X-Client"] = ADMIN_CLIENT;
  if (siteId) headers["X-Site-Id"] = siteId;
  if (as && jars[as]) headers.Cookie = jars[as];
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { status: res.status, body: json, setCookie: res.headers.get("set-cookie") };
}

async function login(key, host) {
  const r = await api("POST", "/api/auth/login", { host, body: { email: EMAIL(key), password: PASSWORD } });
  if (r.status === 200) jars[key] = r.setCookie.split(";")[0];
  return r;
}

const ids = (r) => (r.body?.data ?? []).map((x) => x._id ?? x.id);

async function makeUser(key, role, site) {
  const user = await prisma.user.create({
    data: {
      name: key,
      email: EMAIL(key),
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: role === "SiteAdmin" ? "SiteAdmin" : role,
      isVerified: true,
      memberships: { create: { siteId: site.id, role } },
    },
  });
  U[key] = user;
}

async function makeProperty(key, site, owner) {
  P[key] = await prisma.property.create({
    data: { title: `xt-property-${key}`, siteId: site.id, ownerId: owner.id, status: "active" },
  });
}

async function makeBooking(key, property, guest) {
  B[key] = await prisma.booking.create({
    data: {
      bookingId: `XT-${key}-${crypto.randomUUID().slice(0, 6)}`,
      propertyId: property.id,
      userId: guest.id,
      checkIn: new Date("2027-01-10"),
      checkOut: new Date("2027-01-12"),
      totalNights: 2,
      guestName: guest.name,
      guestEmail: guest.email,
      pricing: {},
      totalAmount: 100,
    },
  });
}

async function cleanup() {
  const sites = await prisma.site.findMany({ where: { slug: { in: ["xt-a", "xt-b"] } } });
  const siteIds = sites.map((s) => s.id);
  const users = await prisma.user.findMany({ where: { email: { startsWith: "xt-" } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  await prisma.booking.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { property: { siteId: { in: siteIds } } }] } });
  await prisma.ownerInvite.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.ownerGrant.deleteMany({ where: { OR: [{ ownerId: { in: userIds } }, { guestUserId: { in: userIds } }] } });
  await prisma.property.deleteMany({ where: { siteId: { in: siteIds } } });
  await prisma.thingToDo.deleteMany({ where: { siteId: { in: siteIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.site.deleteMany({ where: { id: { in: siteIds } } });
  invalidateSiteCache();
}

before(async () => {
  await cleanup();
  for (const k of ["a", "b"]) {
    S[k] = await prisma.site.create({ data: { slug: `xt-${k}`, name: `Complex ${k.toUpperCase()}` } });
    await prisma.siteDomain.create({ data: { hostname: HOST[k], siteId: S[k].id, isPrimary: true } });
    await prisma.siteContent.create({
      data: {
        siteId: S[k].id,
        section: "brand",
        data: { siteName: `Brand ${k.toUpperCase()}`, tagline: "", phone: "", email: "", address: "", facebook: "", instagram: "", tiktok: "", x: "" },
      },
    });
    T[k] = await prisma.thingToDo.create({ data: { name: `xt-thing-${k}`, category: "Food", siteId: S[k].id } });
  }
  invalidateSiteCache();
  for (const k of ["a", "b"]) {
    const K = k.toUpperCase();
    await makeUser(`owner${K}`, "Owner", S[k]);
    await makeUser(`siteAdmin${K}`, "SiteAdmin", S[k]);
    await makeUser(`guest${K}`, "Guest", S[k]);
    await makePropertyFor(k, K);
  }
  U.superXt = await prisma.user.create({
    data: { name: "super", email: EMAIL("super"), passwordHash: await bcrypt.hash(PASSWORD, 4), role: "SuperAdmin", isVerified: true },
  });
  await makeBooking("A", P.A, U.guestA);
  await makeBooking("B", P.B, U.guestB);
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  // Admin-panel style sessions (no complex host) and public-site sessions.
  for (const key of ["ownerA", "ownerB", "siteAdminA", "siteAdminB"]) { const r = await login(key); if (r.status !== 200) console.log("LOGIN", key, r.status, JSON.stringify(r.body)); }
  await login("super");
  await login("guestA", HOST.a);
  await login("guestB", HOST.b);
});

async function makePropertyFor(k, K) {
  await makeProperty(K, S[k], U[`owner${K}`]);
}

after(async () => {
  server?.close();
  await cleanup();
  await prisma.$disconnect();
});

test("public lists show only the requesting complex's properties and Things To Do", async () => {
  const a = await api("GET", "/api/property", { host: HOST.a });
  assert.ok(ids(a).includes(P.A.id));
  assert.ok(!ids(a).includes(P.B.id));
  const b = await api("GET", "/api/property", { host: HOST.b });
  assert.ok(ids(b).includes(P.B.id) && !ids(b).includes(P.A.id));

  const ta = await api("GET", "/api/thingtodo", { host: HOST.a });
  assert.deepEqual(ids(ta).filter((i) => [T.a.id, T.b.id].includes(i)), [T.a.id]);
});

test("a property from another complex looks nonexistent", async () => {
  assert.equal((await api("GET", `/api/property/${P.B.id}`, { host: HOST.a })).status, 404);
  assert.equal((await api("GET", `/api/property/${P.A.id}`, { host: HOST.a })).status, 200);
  assert.equal((await api("GET", `/api/thingtodo/${T.b.id}`, { host: HOST.a })).status, 404);
});

test("site content is per complex", async () => {
  const a = await api("GET", "/api/site-content", { host: HOST.a });
  const b = await api("GET", "/api/site-content", { host: HOST.b });
  assert.equal(a.body.data.brand.siteName, "Brand A");
  assert.equal(b.body.data.brand.siteName, "Brand B");
});

test("a session from one complex is signed out on another", async () => {
  assert.equal((await api("GET", "/api/user", { as: "guestA", host: HOST.a })).status, 200);
  assert.equal((await api("GET", "/api/user", { as: "guestA", host: HOST.b })).status, 401);
  assert.equal((await login("guestA", HOST.b)).status, 401);
});

test("owners see and change only their own properties", async () => {
  const list = await api("GET", "/api/property", { as: "ownerA", admin: true });
  assert.deepEqual(ids(list).filter((i) => [P.A.id, P.B.id].includes(i)), [P.A.id]);
  assert.equal((await api("GET", `/api/property/${P.B.id}`, { as: "ownerA", admin: true })).status, 404);
  assert.equal((await api("PATCH", `/api/property/${P.B.id}`, { as: "ownerA", admin: true, body: { title: "x" } })).status, 404);
  assert.equal((await api("DELETE", `/api/property/${P.B.id}`, { as: "ownerA", admin: true })).status, 404);
});

test("site admins see their whole complex but cannot change other owners' properties or bookings", async () => {
  const list = await api("GET", "/api/property", { as: "siteAdminA", admin: true });
  assert.deepEqual(ids(list).filter((i) => [P.A.id, P.B.id].includes(i)), [P.A.id]);
  assert.equal((await api("PATCH", `/api/property/${P.A.id}`, { as: "siteAdminA", admin: true, body: { title: "x" } })).status, 404);

  const bookings = await api("GET", "/api/booking", { as: "siteAdminA", admin: true });
  const got = (bookings.body.data?.items ?? bookings.body.data?.bookings ?? bookings.body.data ?? []).map((x) => x._id ?? x.id);
  assert.ok(got.includes(B.A.id) && !got.includes(B.B.id));
  assert.equal((await api("GET", `/api/booking/${B.A.id}`, { as: "siteAdminA" })).status, 200);
  assert.equal((await api("PATCH", `/api/booking/${B.A.id}/accept`, { as: "siteAdminA", admin: true })).status, 404);
});

test("bookings are invisible across complexes", async () => {
  assert.equal((await api("GET", `/api/booking/${B.B.id}`, { as: "ownerA" })).status, 404);
  assert.equal((await api("GET", `/api/booking/${B.B.id}`, { as: "siteAdminA" })).status, 404);
  assert.equal((await api("GET", `/api/booking/${B.B.id}`, { as: "guestA", host: HOST.a })).status, 404);
  assert.equal((await api("PATCH", `/api/booking/${B.B.id}/accept`, { as: "ownerA", admin: true })).status, 404);
  const mine = await api("GET", "/api/booking", { as: "ownerA", admin: true });
  const got = (mine.body.data?.items ?? mine.body.data?.bookings ?? []).map((x) => x._id ?? x.id);
  assert.ok(!got.includes(B.B.id));
});

test("user management is limited to your complex and to Owners", async () => {
  const noOwner = await api("GET", "/api/user/all-users", { as: "ownerA" });
  assert.equal(noOwner.status, 403);

  const list = await api("GET", "/api/user/all-users?limit=100", { as: "siteAdminA" });
  const emails = (list.body.data?.users ?? []).map((u) => u.email);
  assert.ok(emails.includes(EMAIL("ownerA")));
  assert.ok(!emails.includes(EMAIL("ownerB")));
  assert.ok(!emails.some((e) => e === "admin@rentalpropertymanager.com"));

  assert.equal((await api("PATCH", `/api/user/${U.ownerB.id}`, { as: "siteAdminA", body: { isActive: false } })).status, 404);
  assert.equal((await api("POST", `/api/user/${U.ownerB.id}/reset-password`, { as: "siteAdminA" })).status, 404);
  assert.equal((await api("DELETE", `/api/user/${U.ownerB.id}`, { as: "siteAdminA" })).status, 404);

  const made = await api("POST", "/api/user", { as: "siteAdminA", body: { name: "n", email: EMAIL("created"), role: "SiteAdmin" } });
  assert.equal(made.status, 403);
  const owner = await api("POST", "/api/user", { as: "siteAdminA", body: { name: "n", email: EMAIL("created"), role: "Owner" } });
  assert.equal(owner.status, 201);
  const m = await prisma.siteMembership.findFirst({ where: { user: { email: EMAIL("created") } } });
  assert.equal(m.siteId, S.a.id);
  assert.equal(m.role, "Owner");

  // can't change roles, even of own-complex users
  assert.equal((await api("PATCH", `/api/user/${U.ownerA.id}`, { as: "siteAdminA", body: { role: "SiteAdmin" } })).status, 403);
});

test("site content and Things To Do edits stay inside the editor's complex", async () => {
  const brand = { siteName: "Edited by A", tagline: "", phone: "", email: "", address: "", facebook: "", instagram: "", tiktok: "", x: "" };
  const put = await api("PUT", "/api/site-content/brand", { as: "siteAdminA", body: brand });
  assert.equal(put.status, 200);
  assert.equal((await api("GET", "/api/site-content", { host: HOST.a })).body.data.brand.siteName, "Edited by A");
  assert.equal((await api("GET", "/api/site-content", { host: HOST.b })).body.data.brand.siteName, "Brand B");

  assert.equal((await api("PUT", "/api/site-content/brand", { as: "ownerA", body: brand })).status, 403);

  assert.equal((await api("DELETE", `/api/thingtodo/${T.b.id}`, { as: "siteAdminA", admin: true })).status, 404);
  assert.equal((await api("PATCH", `/api/thingtodo/${T.b.id}`, { as: "siteAdminA", admin: true, body: { name: "x" } })).status, 404);
  assert.equal((await api("DELETE", `/api/thingtodo/${T.a.id}`, { as: "ownerA", admin: true })).status, 403);
});

test("an invite from another complex's owner cannot be claimed", async () => {
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.ownerInvite.create({
    data: {
      ownerId: U.ownerB.id,
      email: EMAIL("guestA"),
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  assert.equal((await api("POST", "/api/invite/claim", { as: "guestA", host: HOST.a, body: { token } })).status, 410);
});

test("a super admin sees every complex, or exactly one when narrowed", async () => {
  const mine = (r) => ids(r).filter((i) => [P.A.id, P.B.id].includes(i)).sort();
  const all = await api("GET", "/api/property", { as: "super", admin: true });
  assert.deepEqual(mine(all), [P.A.id, P.B.id].sort());

  const picked = await api("GET", "/api/property", { as: "super", admin: true, siteId: S.a.id });
  assert.deepEqual(mine(picked), [P.A.id]);

  // On a complex's own domain a super admin gets that complex, like anyone else.
  const onB = await api("GET", "/api/property", { as: "super", host: HOST.b });
  assert.deepEqual(mine(onB), [P.B.id]);
  assert.equal((await api("GET", `/api/property/${P.A.id}`, { as: "super", host: HOST.b })).status, 404);

  const users = await api("GET", "/api/user/all-users?limit=100", { as: "super", siteId: S.b.id });
  const emails = (users.body.data?.users ?? []).map((u) => u.email);
  assert.ok(emails.includes(EMAIL("ownerB")) && !emails.includes(EMAIL("ownerA")));
});
