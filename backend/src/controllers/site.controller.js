import dns from "node:dns/promises";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { invalidateSiteCache, normalizeHost, originFor, primaryOriginFor } from "../lib/siteResolver.js";

// Public: the complex this request is for, so the website can build canonical
// URLs, the sitemap and robots.txt on the right domain.
export async function currentSite(req, res, next) {
  try {
    return ok(res, {
      id: req.site.id,
      name: req.site.name,
      origin: (await primaryOriginFor(req.site.id)) ?? null,
      matched: !!req.siteMatched,
    });
  } catch (err) {
    next(err);
  }
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$|^localhost$/;

const hostnameSchema = z
  .string()
  .trim()
  .transform((v) => normalizeHost(v))
  .refine((v) => HOSTNAME.test(v), "Enter a hostname like stay.example.com (no https:// or path).");

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.")
  .min(2)
  .max(40);

async function listShape() {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      domains: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      memberships: { where: { role: "SiteAdmin" }, include: { user: { select: { id: true, name: true, email: true, isActive: true } } } },
      _count: { select: { properties: true, memberships: true, thingsToDo: true } },
    },
  });
  return sites.map((s) => ({
    _id: s.id,
    slug: s.slug,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt,
    domains: s.domains.map((d) => ({ _id: d.id, hostname: d.hostname, isPrimary: d.isPrimary })),
    siteAdmins: s.memberships.map((m) => m.user),
    counts: { properties: s._count.properties, members: s._count.memberships, thingsToDo: s._count.thingsToDo },
  }));
}

const one = async (id) => (await listShape()).find((s) => s._id === id);
const done = (res, id, message, status) => {
  invalidateSiteCache();
  return one(id).then((site) => ok(res, site, message, status));
};

export async function listSites(_req, res, next) {
  try {
    return ok(res, await listShape());
  } catch (err) {
    next(err);
  }
}

export async function createSite(req, res, next) {
  try {
    const body = z.object({ name: z.string().trim().min(1).max(80), slug: slugSchema }).parse(req.body);
    if (await prisma.site.findUnique({ where: { slug: body.slug } })) throw new ApiError("That short name is already used.", 409);
    const site = await prisma.site.create({ data: body });
    return done(res, site.id, "Complex created", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateSite(req, res, next) {
  try {
    const body = z.object({ name: z.string().trim().min(1).max(80).optional(), isActive: z.boolean().optional() }).parse(req.body);
    const site = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!site) throw new ApiError("Complex not found.", 404);
    if (body.isActive === false && site.slug === "default") {
      throw new ApiError("The default complex can't be deactivated.", 400);
    }
    await prisma.site.update({ where: { id: site.id }, data: body });
    return done(res, site.id, "Complex updated");
  } catch (err) {
    next(err);
  }
}

export async function addDomain(req, res, next) {
  try {
    const body = z.object({ hostname: hostnameSchema, isPrimary: z.boolean().optional() }).parse(req.body);
    const site = await prisma.site.findUnique({ where: { id: req.params.id }, include: { domains: true } });
    if (!site) throw new ApiError("Complex not found.", 404);
    if (await prisma.siteDomain.findUnique({ where: { hostname: body.hostname } })) {
      throw new ApiError("That domain is already assigned to a complex.", 409);
    }
    const makePrimary = body.isPrimary || site.domains.length === 0;
    await prisma.$transaction([
      ...(makePrimary ? [prisma.siteDomain.updateMany({ where: { siteId: site.id }, data: { isPrimary: false } })] : []),
      prisma.siteDomain.create({ data: { hostname: body.hostname, siteId: site.id, isPrimary: makePrimary } }),
    ]);
    return done(res, site.id, "Domain added", 201);
  } catch (err) {
    next(err);
  }
}

async function loadDomain(req) {
  const domain = await prisma.siteDomain.findFirst({ where: { id: req.params.domainId, siteId: req.params.id } });
  if (!domain) throw new ApiError("Domain not found.", 404);
  return domain;
}

export async function makePrimary(req, res, next) {
  try {
    const domain = await loadDomain(req);
    await prisma.$transaction([
      prisma.siteDomain.updateMany({ where: { siteId: domain.siteId }, data: { isPrimary: false } }),
      prisma.siteDomain.update({ where: { id: domain.id }, data: { isPrimary: true } }),
    ]);
    return done(res, domain.siteId, "Primary domain updated");
  } catch (err) {
    next(err);
  }
}

export async function removeDomain(req, res, next) {
  try {
    const domain = await loadDomain(req);
    const others = await prisma.siteDomain.count({ where: { siteId: domain.siteId, id: { not: domain.id } } });
    if (domain.isPrimary && others > 0) {
      throw new ApiError("Make another domain primary before removing this one.", 409);
    }
    await prisma.siteDomain.delete({ where: { id: domain.id } });
    return done(res, domain.siteId, "Domain removed");
  } catch (err) {
    next(err);
  }
}

// Onboarding aid: does DNS point anywhere, and does this domain actually reach
// the app? Asks the domain itself for /api/health, which travels the same path
// as real visitors (custom domain -> frontend -> backend).
export async function checkDomain(req, res, next) {
  try {
    const domain = await loadDomain(req);
    const result = { hostname: domain.hostname, dns: { ok: false, records: [] }, https: { ok: false }, servesThisApp: false };

    try {
      const [cname, a] = await Promise.allSettled([dns.resolveCname(domain.hostname), dns.resolve4(domain.hostname)]);
      if (cname.status === "fulfilled") result.dns.records.push(...cname.value.map((v) => `CNAME ${v}`));
      if (a.status === "fulfilled") result.dns.records.push(...a.value.map((v) => `A ${v}`));
      result.dns.ok = result.dns.records.length > 0;
    } catch {
      /* leave as not ok */
    }

    if (result.dns.ok) {
      try {
        const r = await fetch(`${originFor(domain.hostname)}/api/health`, { signal: AbortSignal.timeout(6000) });
        result.https = { ok: true, status: r.status };
        const body = await r.json().catch(() => null);
        result.servesThisApp = body?.ok === true;
      } catch (e) {
        result.https = { ok: false, error: e?.cause?.code || e?.name || "unreachable" };
      }
    }
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}
