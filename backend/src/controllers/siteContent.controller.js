import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { saveFile } from "../lib/storage.js";
import { SECTIONS, SECTION_SCHEMAS, SECTION_DEFAULTS } from "../lib/siteContent.js";

// Single-tenant for now: everything hangs off one "default" site row.
function getDefaultSite() {
  return prisma.site.upsert({ where: { slug: "default" }, update: {}, create: { slug: "default" } });
}

function sectionOr404(name) {
  if (!SECTIONS.includes(name)) throw new ApiError("Unknown content section.", 404);
  return name;
}

export async function getSiteContent(_req, res, next) {
  try {
    const site = await getDefaultSite();
    const rows = await prisma.siteContent.findMany({ where: { siteId: site.id } });
    const stored = Object.fromEntries(rows.map((r) => [r.section, r.data]));
    // Stored data wins, but new default fields still show up for sections saved
    // before those fields existed.
    const content = Object.fromEntries(
      SECTIONS.map((s) => [s, { ...SECTION_DEFAULTS[s], ...(stored[s] ?? {}) }]),
    );
    return ok(res, content);
  } catch (err) {
    next(err);
  }
}

export async function saveSection(req, res, next) {
  try {
    const section = sectionOr404(req.params.section);
    const data = SECTION_SCHEMAS[section].parse(req.body);
    const site = await getDefaultSite();
    await prisma.siteContent.upsert({
      where: { siteId_section: { siteId: site.id, section } },
      update: { data },
      create: { siteId: site.id, section, data },
    });
    return ok(res, data, "Section saved");
  } catch (err) {
    next(err);
  }
}

export async function resetSection(req, res, next) {
  try {
    const section = sectionOr404(req.params.section);
    const site = await getDefaultSite();
    await prisma.siteContent.deleteMany({ where: { siteId: site.id, section } });
    return ok(res, SECTION_DEFAULTS[section], "Section reset to defaults");
  } catch (err) {
    next(err);
  }
}

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) throw new ApiError("No image uploaded.", 400);
    if (!req.file.mimetype.startsWith("image/")) throw new ApiError("Only image files are allowed.", 400);
    const { url } = await saveFile(req.file);
    return ok(res, { url }, "Image uploaded", 201);
  } catch (err) {
    next(err);
  }
}
