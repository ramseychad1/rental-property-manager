import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, fail, ApiError } from "../lib/response.js";
import { serializeProperty } from "../lib/serialize.js";
import { unflatten } from "../middleware/upload.js";
import { saveFile, deleteFile } from "../lib/storage.js";

const HELD_STATUSES = ["pending", "accepted", "booked"];

function toArray(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
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
  location: z
    .object({
      address: z.string().trim().optional().default(""),
      city: z.string().trim().optional().default(""),
      country: z.string().trim().optional().default(""),
      zipCode: z.string().trim().optional().default(""),
      url: z.string().trim().optional().default(""),
    })
    .default({}),
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

export async function listProperties(req, res, next) {
  try {
    const isAdmin = req.user?.role === "Admin";
    const { search, status } = req.query;

    const where = {};
    if (!isAdmin) {
      where.status = "active";
    } else if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.title = { contains: String(search), mode: "insensitive" };
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ok(res, properties.map(serializeProperty));
  } catch (err) {
    next(err);
  }
}

export async function getProperty(req, res, next) {
  try {
    const isAdmin = req.user?.role === "Admin" || req.query.user === "admin";
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });

    if (!property) throw new ApiError("Property not found.", 404);
    if (!isAdmin && property.status !== "active") {
      throw new ApiError("Property not found.", 404);
    }

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
        thumbnailUrl: thumbnail?.url ?? null,
        gallery: gallery.map((g) => g.url),
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
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError("Property not found.", 404);

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
    if (req.body.amenities !== undefined) data.amenities = toArray(req.body.amenities);

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
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) throw new ApiError("Property not found.", 404);

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
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return ok(res, Array.from(dates).sort());
  } catch (err) {
    next(err);
  }
}

export async function pricingPreview(req, res, next) {
  try {
    const { from, to } = req.query;
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) throw new ApiError("Property not found.", 404);

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
      const season = seasons.find((s) =>
        (s.dateRanges || []).some((r) => key >= r.startDate.slice(0, 10) && key <= r.endDate.slice(0, 10)),
      );
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
