import { prisma } from "./prisma.js";
import { getDefaultSite } from "./membership.js";

// Maps the public hostname a visitor used to a Site (via SiteDomain). The table
// is tiny and read on every request, so it's cached briefly in memory; call
// invalidateSiteCache() after editing domains.
const TTL_MS = 60_000;
let cache = { at: 0, byHost: new Map(), primaryBySite: new Map(), fallback: null };

// "Example.com:443." -> "example.com"
export function normalizeHost(value) {
  if (!value || typeof value !== "string") return "";
  let h = value.trim().toLowerCase();
  if (h.includes("://")) {
    try {
      h = new URL(h).host;
    } catch {
      return "";
    }
  }
  return h.replace(/:\d+$/, "").replace(/\.$/, "");
}

export function invalidateSiteCache() {
  cache = { at: 0, byHost: new Map(), primaryBySite: new Map(), fallback: null };
}

async function load() {
  if (cache.fallback && Date.now() - cache.at < TTL_MS) return cache;
  const [domains, fallback] = await Promise.all([
    prisma.siteDomain.findMany({ where: { site: { isActive: true } }, include: { site: true } }),
    getDefaultSite(),
  ]);
  const primaryBySite = new Map();
  for (const d of domains) if (d.isPrimary) primaryBySite.set(d.siteId, d.hostname);
  cache = { at: Date.now(), byHost: new Map(domains.map((d) => [d.hostname, d.site])), primaryBySite, fallback };
  return cache;
}

// Returns { site, matched }. `matched` is false when no candidate host belongs
// to a complex and we fell back to the default site.
export async function resolveSiteForHosts(candidates) {
  const { byHost, fallback } = await load();
  for (const c of candidates) {
    const site = byHost.get(normalizeHost(c));
    if (site) return { site, matched: true };
  }
  return { site: fallback, matched: false };
}

const isLocalHost = (h) => h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
export const originFor = (hostname) => `${isLocalHost(hostname) ? "http" : "https"}://${hostname}`;

// Public origin of a complex (its primary domain), e.g. "https://stay.example.com",
// or null when it has no domain. Used for links in emails.
export async function primaryOriginFor(siteId) {
  const { primaryBySite } = await load();
  const host = primaryBySite.get(siteId);
  return host ? originFor(host) : null;
}

// Is this browser Origin one of the complexes' domains? (for CORS)
export async function isComplexOrigin(origin) {
  const { byHost } = await load();
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  const h = normalizeHost(host);
  return byHost.has(h) && origin === originFor(h);
}
