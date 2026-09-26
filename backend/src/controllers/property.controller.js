import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, fail, ApiError } from "../lib/response.js";
import { serializeProperty } from "../lib/serialize.js";
import { unflatten } from "../middleware/upload.js";
import { saveFile, deleteFile } from "../lib/storage.js";
import { dateOnly } from "../lib/serialize.js";
import { seasonForKey } from "../lib/seasonRange.js";
import {
  isStaff,
  isSuperAdmin,
  propertyScope,
  findManagedProperty,
  visiblePropertyWhere,
  findViewableProperty,
} from "../lib/access.js";
import { assertTermsSumTo100 } from "../lib/paymentSchedule.js";

const HELD_STATUSES = ["pending", "accepted", "booked"];

function toArray(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

const paymentTermSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1, "Label is required").max(60),
  percent: z.coerce.number().min(0.01, "Must be > 0").max(100),
  dueType: z.enum(["immediate", "months_before_checkin", "days_before_checkin"]),
  offset: z.coerce.number().int().min(0).default(0),
});
const paymentTermsSchema = z.array(paymentTermSchema).max(12).default([]);

// req.body.paymentTerms arrives as a JSON string over multipart form data
// (like existingGallery below). Absent = "don't touch it" on a partial update.
function parsePaymentTerms(raw) {
  if (raw === undefined) return undefined;
  try {
    return paymentTermsSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    throw new ApiError("Invalid payment terms.", 400);
  }
}

const addOnSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1, "Label is required").max(60),
  price: z.coerce.number().min(0.01, "Must be > 0"),
});
const addOnsSchema = z.array(addOnSchema).max(20).default([]);

// Same wire shape as paymentTerms above - a JSON string over multipart form data.
function parseAddOns(raw) {
  if (raw === undefined) return undefined;
  try {
    return addOnsSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    throw new ApiError("Invalid add-ons.", 400);
  }
}

const propertySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional().default(""),
  minNights: z.coerce.number().int().min(1).default(2),
  maxNights: z.coerce.number().int().min(1).optional(),
  guests: z.coerce.number().int().min(1).default(2),
  bedrooms: z.coerce.number().int().min(0).default(1),
  bathrooms: z.coerce.number().int().min(0).default(1),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
  isPrivate: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().default(false)),
  location: z
    .object({
      address: z.string().trim().optional().default(""),
      city: z.string().trim().optional().default(""),
      country: z.string().trim().optional().default(""),
      zipCode: z.string().trim().optional().default(""),
      url: z.string().trim().optional().default(""),
    })
    .default({}),
  ownerId: z.string().trim().optional(),
  depositEnabled: z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().default(false)),
  depositAmount: z.coerce.number().min(0).default(0),
  paymentInstructions: z.string().trim().max(2000).optional().default(""),
  price: z
    .object({
      nightly: z.coerce.number().min(0).default(0),
      currency: z.string().trim().optional().default("USD"),
      cleaningFee: z.coerce.number().min(0).default(0),
      serviceFee: z.coerce.number().min(0).default(0),
      taxRate: z.coerce.number().min(0).default(0),
    })
    .default({}),
});

// Must match the X-Client header set in admin/src/lib/api.js.
const ADMIN_CLIENT = "rental-property-manager-admin-panel";

// Owners always own what they create. A SuperAdmin may assign any Owner or
// SuperAdmin (or leave it unassigned).
async function resolveOwnerId(user, requested) {
  if (!isSuperAdmin(user)) return user.id;
  if (!requested) return null;
  const owner = await prisma.user.findFirst({
    where: { id: requested, role: { in: ["Owner", "SuperAdmin"] }, isActive: true },
  });
  if (!owner) throw new ApiError("Selected owner not found.", 400);
  return owner.id;
}

export async function listProperties(req, res, next) {
  try {
    // The admin panel asks for its "manage" view (all statuses, only the
    // properties the user may manage) via this header. Everyone else - the
    // public site, even when a staff member is signed in on it - sees active
    // properties only, minus private ones they have no access to.
    const managing = isStaff(req.user) && req.get("X-Client") === ADMIN_CLIENT;
    const { search, status } = req.query;

    const where = {};
    if (!managing) {
      Object.assign(where, visiblePropertyWhere(req.user));
    } else {
      Object.assign(where, propertyScope(req.user));
      if (status && status !== "all") where.status = status;
    }

    if (search) {
      where.title = { contains: String(search), mode: "insensitive" };
    }

    // Super Admins see who manages each property in the admin list.
    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(managing && isSuperAdmin(req.user) && { include: { owner: { select: { id: true, name: true, email: true } } } }),
    });

    return ok(res, properties.map(serializeProperty));
  } catch (err) {
    next(err);
  }
}

export async function getProperty(req, res, next) {
  try {
    // Inactive properties, and private ones the viewer has no grant for, look
    // exactly like nonexistent ids.
    const property = await findViewableProperty(req.user, req.params.id);

    return ok(res, serializeProperty(property));
  } catch (err) {
    next(err);
  }
}

export async function createProperty(req, res, next) {
  try {
    const body = propertySchema.parse(unflatten(req.body));
    const amenities = toArray(req.body.amenities);

    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    const thumbnail = thumbnailFile ? await saveFile(thumbnailFile) : null;
    const gallery = await Promise.all(galleryFiles.map((f) => saveFile(f)));

    const property = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description,
        minNights: body.minNights,
        maxNights: body.maxNights ?? null,
        guests: body.guests,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        status: body.status,
        isPrivate: body.isPrivate,
        amenities,
        locationAddress: body.location.address,
        locationCity: body.location.city,
        locationCountry: body.location.country,
        locationZipCode: body.location.zipCode,
        locationUrl: body.location.url,
        priceNightly: body.price.nightly,
        priceCurrency: body.price.currency,
        priceCleaningFee: body.price.cleaningFee,
        priceServiceFee: body.price.serviceFee,
        priceTaxRate: body.price.taxRate,
        depositEnabled: body.depositEnabled,
        depositAmount: body.depositAmount,
        paymentInstructions: body.paymentInstructions,
        paymentTerms: (() => {
          const terms = parsePaymentTerms(req.body.paymentTerms) ?? [];
          assertTermsSumTo100(terms);
          return terms;
        })(),
        addOns: parseAddOns(req.body.addOns) ?? [],
        thumbnailUrl: thumbnail?.url ?? null,
        gallery: gallery.map((g) => g.url),
        ownerId: await resolveOwnerId(req.user, body.ownerId),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Property created",
      data: serializeProperty(property),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProperty(req, res, next) {
  try {
    const existing = await findManagedProperty(req.user, req.params.id);

    const flat = unflatten(req.body);
    const partialSchema = propertySchema.partial();
    const body = partialSchema.parse(flat);

    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.minNights !== undefined) data.minNights = body.minNights;
    if (body.maxNights !== undefined) data.maxNights = body.maxNights;
    if (body.guests !== undefined) data.guests = body.guests;
    if (body.bedrooms !== undefined) data.bedrooms = body.bedrooms;
    if (body.bathrooms !== undefined) data.bathrooms = body.bathrooms;
    if (body.status !== undefined) data.status = body.status;
    if (flat.isPrivate !== undefined) data.isPrivate = body.isPrivate;
    if (req.body.amenities !== undefined) data.amenities = toArray(req.body.amenities);
    if (isSuperAdmin(req.user) && body.ownerId !== undefined) {
      data.ownerId = await resolveOwnerId(req.user, body.ownerId);
    }
    if (flat.depositEnabled !== undefined) data.depositEnabled = body.depositEnabled;
    if (flat.depositAmount !== undefined) data.depositAmount = body.depositAmount;
    if (flat.paymentInstructions !== undefined) data.paymentInstructions = body.paymentInstructions;
    const paymentTerms = parsePaymentTerms(req.body.paymentTerms);
    if (paymentTerms !== undefined) {
      assertTermsSumTo100(paymentTerms);
      data.paymentTerms = paymentTerms;
    }
    const addOns = parseAddOns(req.body.addOns);
    if (addOns !== undefined) data.addOns = addOns;

    if (body.location) {
      if (body.location.address !== undefined) data.locationAddress = body.location.address;
      if (body.location.city !== undefined) data.locationCity = body.location.city;
      if (body.location.country !== undefined) data.locationCountry = body.location.country;
      if (body.location.zipCode !== undefined) data.locationZipCode = body.location.zipCode;
      if (body.location.url !== undefined) data.locationUrl = body.location.url;
    }

    if (body.price) {
      if (body.price.nightly !== undefined) data.priceNightly = body.price.nightly;
      if (body.price.currency !== undefined) data.priceCurrency = body.price.currency;
      if (body.price.cleaningFee !== undefined) data.priceCleaningFee = body.price.cleaningFee;
      if (body.price.serviceFee !== undefined) data.priceServiceFee = body.price.serviceFee;
      if (body.price.taxRate !== undefined) data.priceTaxRate = body.price.taxRate;
    }

    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile) {
      if (existing.thumbnailUrl) await deleteFile(existing.thumbnailUrl);
      const { url } = await saveFile(thumbnailFile);
      data.thumbnailUrl = url;
    }

    const galleryFiles = req.files?.gallery || [];
    if (galleryFiles.length || req.body.existingGallery !== undefined) {
      const keep = req.body.existingGallery ? JSON.parse(req.body.existingGallery) : existing.gallery;
      const removed = existing.gallery.filter((g) => !keep.includes(g));
      await Promise.all(removed.map((g) => deleteFile(g)));

      const uploaded = await Promise.all(galleryFiles.map((f) => saveFile(f)));
      data.gallery = [...keep, ...uploaded.map((g) => g.url)];
    }

    const property = await prisma.property.update({ where: { id: req.params.id }, data });
    return ok(res, serializeProperty(property), "Property updated");
  } catch (err) {
    next(err);
  }
}

export async function removeProperty(req, res, next) {
  try {
    const property = await findManagedProperty(req.user, req.params.id);

    await prisma.property.delete({ where: { id: req.params.id } });

    if (property.thumbnailUrl) await deleteFile(property.thumbnailUrl);
    await Promise.all((property.gallery || []).map((g) => deleteFile(g)));

    return ok(res, null, "Property deleted");
  } catch (err) {
    if (err.code === "P2003") {
      return fail(res, "Cannot delete a property that has existing bookings.", 409);
    }
    next(err);
  }
}

export async function bookedDates(req, res, next) {
  try {
    await findViewableProperty(req.user, req.params.id);
    const bookings = await prisma.booking.findMany({
      where: { propertyId: req.params.id, bookingStatus: { in: HELD_STATUSES } },
      select: { checkIn: true, checkOut: true },
    });

    const dates = new Set();
    for (const b of bookings) {
      const cursor = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      while (cursor < end) {
        dates.add(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return ok(res, Array.from(dates).sort());
  } catch (err) {
    next(err);
  }
}

// Admin "Booked dates" tab: one row per held booking that hasn't ended yet.
// (bookedDates above returns a flat list of individual nights for the public
// calendar - a different shape, so this is a separate endpoint.)
export async function bookedRanges(req, res, next) {
  try {
    await findManagedProperty(req.user, req.params.id);
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

    const bookings = await prisma.booking.findMany({
      where: { propertyId: req.params.id, bookingStatus: { in: HELD_STATUSES }, checkOut: { gte: today } },
      orderBy: { checkIn: "asc" },
      select: { id: true, bookingId: true, guestName: true, checkIn: true, checkOut: true, totalNights: true, bookingStatus: true },
    });

    return ok(res, {
      blockedRanges: bookings.map((b) => ({
        id: b.id,
        bookingId: b.bookingId,
        guestName: b.guestName,
        startDate: dateOnly(b.checkIn),
        endDate: dateOnly(b.checkOut),
        nights: b.totalNights,
        status: b.bookingStatus,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function pricingPreview(req, res, next) {
  try {
    const { from, to } = req.query;
    const property = await findViewableProperty(req.user, req.params.id);

    const seasons = await prisma.season.findMany({ where: { propertyId: req.params.id } });

    const start = new Date(String(from).slice(0, 10));
    const end = new Date(String(to).slice(0, 10));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new ApiError("Invalid date range.", 400);
    }

    let subTotal = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      const key = cursor.toISOString().slice(0, 10);
      const season = seasonForKey(seasons, key);
      subTotal += season ? season.pricePerNight : property.priceNightly;
      cursor.setDate(cursor.getDate() + 1);
    }

    const total = subTotal + property.priceCleaningFee + property.priceServiceFee;
    return ok(res, { subTotal, cleaningFee: property.priceCleaningFee, serviceFee: property.priceServiceFee, total });
  } catch (err) {
    next(err);
  }
}

export async function checkAvailability(req, res, next) {
  try {
    await findManagedProperty(req.user, req.params.id);
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) throw new ApiError("checkIn and checkOut are required.", 400);

    const overlapping = await prisma.booking.count({
      where: {
        propertyId: req.params.id,
        bookingStatus: { in: HELD_STATUSES },
        checkIn: { lt: new Date(String(checkOut)) },
        checkOut: { gt: new Date(String(checkIn)) },
      },
    });

    return ok(res, { available: overlapping === 0 });
  } catch (err) {
    next(err);
  }
}
