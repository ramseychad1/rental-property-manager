import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { serializeThingToDo } from "../lib/serialize.js";
import { isSuperAdmin } from "../lib/access.js";
import { saveFile, deleteFile } from "../lib/storage.js";
import { unflatten } from "../middleware/upload.js";

// Must match the X-Client header set in admin/src/lib/api.js.
const ADMIN_CLIENT = "rental-property-manager-admin-panel";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http:// or https://")
  .default("");

const thingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(4000).default(""),
  category: z.string().trim().min(1, "Category is required").max(60),
  area: z.string().trim().max(80).default(""),
  location: z
    .object({
      address: z.string().trim().max(200).default(""),
      url: optionalUrl,
    })
    .default({}),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Public site: active items only. The admin panel (Super Admin + its X-Client
// header) gets every status and can filter/search.
export async function listThingsToDo(req, res, next) {
  try {
    const managing = isSuperAdmin(req.user) && req.get("X-Client") === ADMIN_CLIENT;
    const { search, status, category } = req.query;

    const where = {};
    if (!managing) where.status = "active";
    else if (status && status !== "all") where.status = status;
    if (category && category !== "all") where.category = String(category);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
        { area: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const items = await prisma.thingToDo.findMany({
      where,
      orderBy: [{ category: "asc" }, { area: "asc" }, { name: "asc" }],
    });
    return ok(res, items.map(serializeThingToDo));
  } catch (err) {
    next(err);
  }
}

export async function getThingToDo(req, res, next) {
  try {
    const item = await prisma.thingToDo.findUnique({ where: { id: req.params.id } });
    if (!item || (item.status !== "active" && !isSuperAdmin(req.user))) {
      throw new ApiError("Not found.", 404);
    }
    return ok(res, serializeThingToDo(item));
  } catch (err) {
    next(err);
  }
}

export async function createThingToDo(req, res, next) {
  try {
    const body = thingSchema.parse(unflatten(req.body));
    const image = req.file ? await saveFile(req.file) : null;

    const item = await prisma.thingToDo.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        area: body.area,
        locationAddress: body.location.address,
        locationUrl: body.location.url,
        status: body.status,
        imageUrl: image?.url ?? "",
      },
    });
    return res.status(201).json({ success: true, message: "Created", data: serializeThingToDo(item) });
  } catch (err) {
    next(err);
  }
}

// True partial update: only fields present in the request change.
export async function updateThingToDo(req, res, next) {
  try {
    const existing = await prisma.thingToDo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError("Not found.", 404);

    const body = thingSchema.partial().parse(unflatten(req.body));
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.area !== undefined) data.area = body.area;
    if (body.status !== undefined) data.status = body.status;
    if (body.location?.address !== undefined) data.locationAddress = body.location.address;
    if (body.location?.url !== undefined) data.locationUrl = body.location.url;

    if (req.file) {
      const image = await saveFile(req.file);
      data.imageUrl = image.url;
      if (existing.imageUrl) await deleteFile(existing.imageUrl);
    }

    const item = await prisma.thingToDo.update({ where: { id: existing.id }, data });
    return ok(res, serializeThingToDo(item), "Updated");
  } catch (err) {
    next(err);
  }
}

export async function removeThingToDo(req, res, next) {
  try {
    const existing = await prisma.thingToDo.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError("Not found.", 404);
    await prisma.thingToDo.delete({ where: { id: existing.id } });
    if (existing.imageUrl) await deleteFile(existing.imageUrl);
    return ok(res, null, "Deleted");
  } catch (err) {
    next(err);
  }
}
