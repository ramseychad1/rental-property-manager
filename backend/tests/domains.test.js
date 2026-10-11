// Complex + custom-domain management. Local database only (see crossComplex.test.js).
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) throw new Error("domain tests only run against a local database.");

const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
const { invalidateSiteCache, primaryOriginFor } = await import("../src/lib/siteResolver.js");

const PASSWORD = "Test1234!";
let server, base;
const jars = {};
const U = {};
let siteId;

async function api(method, path, { as, host, origin, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (host) headers["X-Site-Host"] = host;
  if (origin) headers.Origin = origin;
  if (as && jars[as]) headers.Cookie = jars[as];
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { status: res.status, body: json, headers: res.headers };
}

async function cleanup() {
  await prisma.siteDomain.deleteMany({ where: { OR: [{ hostname: { endsWith: ".xd-test.com" } }, { site: { slug: { startsWith: "xd-" } } }] } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "xd-" } } });
  await prisma.site.deleteMany({ where: { slug: { startsWith: "xd-" } } });
  invalidateSiteCache();
}

before(async () => {
  await cleanup();
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  const hash = await bcrypt.hash(PASSWORD, 4);
  U.super = await prisma.user.create({ data: { name: "s", email: "xd-super@example.com", passwordHash: hash, role: "SuperAdmin", isVerified: true } });
  const login = async (key) => {
    const r = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `xd-${key}@example.com`, password: PASSWORD }),
    });
    jars[key] = r.headers.get("set-cookie").split(";")[0];
  };
  await login("super");
});

after(async () => {
  server?.close();
  await cleanup();
  await prisma.$disconnect();
});

test("only a super admin can manage complexes", async () => {
  assert.equal((await api("GET", "/api/site")).status, 401);
  const made = await api("POST", "/api/site", { as: "super", body: { name: "Test Complex", slug: "xd-one" } });
  assert.equal(made.status, 201);
  siteId = made.body.data._id;
  assert.equal((await api("POST", "/api/site", { as: "super", body: { name: "Dup", slug: "xd-one" } })).status, 409);
  assert.equal((await api("POST", "/api/site", { as: "super", body: { name: "Bad", slug: "Not Valid" } })).status, 422);
});

test("domains: validation, uniqueness, primary rules", async () => {
  const add = (hostname, isPrimary) => api("POST", `/api/site/${siteId}/domains`, { as: "super", body: { hostname, isPrimary } });

  assert.equal((await add("https://nope.xd-test.com/path")).status, 201); // normalized to a bare hostname
  let site = (await api("GET", "/api/site", { as: "super" })).body.data.find((s) => s._id === siteId);
  assert.equal(site.domains[0].hostname, "nope.xd-test.com");
  assert.equal(site.domains[0].isPrimary, true, "first domain becomes primary");

  assert.equal((await add("NOPE.xd-test.com")).status, 409);
  assert.equal((await add("not a host")).status, 422);

  assert.equal((await add("www.xd-test.com")).status, 201);
  site = (await api("GET", "/api/site", { as: "super" })).body.data.find((s) => s._id === siteId);
  const www = site.domains.find((d) => d.hostname === "www.xd-test.com");
  const bare = site.domains.find((d) => d.hostname === "nope.xd-test.com");
  assert.equal(www.isPrimary, false);

  // can't remove the primary while others exist
  assert.equal((await api("DELETE", `/api/site/${siteId}/domains/${bare._id}`, { as: "super" })).status, 409);
  assert.equal((await api("PATCH", `/api/site/${siteId}/domains/${www._id}/primary`, { as: "super" })).status, 200);
  assert.equal((await api("DELETE", `/api/site/${siteId}/domains/${bare._id}`, { as: "super" })).status, 200);

  // a domain from another complex isn't addressable through this one
  const other = await prisma.siteDomain.findFirst({ where: { site: { slug: "default" } } });
  assert.equal((await api("DELETE", `/api/site/${siteId}/domains/${other.id}`, { as: "super" })).status, 404);
});

test("a new domain resolves immediately, serves its own content and gets CORS + email links", async () => {
  const host = "www.xd-test.com";
  assert.equal((await api("GET", "/api/site/current", { host })).body.data.name, "Test Complex");
  assert.equal((await api("GET", "/api/site/current", { host })).body.data.origin, `https://${host}`);
  assert.equal(await primaryOriginFor(siteId), `https://${host}`);

  const allowed = await api("GET", "/api/health", { origin: `https://${host}` });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("access-control-allow-origin"), `https://${host}`);
  assert.notEqual((await api("GET", "/api/health", { origin: "https://evil.example.com" })).status, 200);

  // deactivating the complex stops its domains resolving
  assert.equal((await api("PATCH", `/api/site/${siteId}`, { as: "super", body: { isActive: false } })).status, 200);
  assert.equal((await api("GET", "/api/site/current", { host })).body.data.matched, false);
});

test("strict mode refuses unknown public hosts", async () => {
  process.env.STRICT_SITE_HOSTS = "true";
  try {
    assert.equal((await api("GET", "/api/health", { host: "nobody.xd-test.com" })).status, 404);
    assert.equal((await api("GET", "/api/health")).status, 200, "no host header (admin panel, health checks) still works");
  } finally {
    delete process.env.STRICT_SITE_HOSTS;
  }
  assert.equal((await api("GET", "/api/health", { host: "nobody.xd-test.com" })).status, 200);
});
