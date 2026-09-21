import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { serializeSeason } from "../lib/serialize.js";
import { normalizeMD, isValidMD } from "../lib/seasonRange.js";
import { findManagedProperty, findViewableProperty } from "../lib/access.js";

const monthDay = z
  .string()
  .trim()
  .transform(normalizeMD)
  .refine(isValidMD, "Use a real month and day (MM-DD)");

// Blank/absent = no season-specific limit.
const nights = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().int().min(1, "Must be at least 1").nullable(),
);

// 0 (Sunday) - 6 (Saturday); blank/absent = any day.
const weekday = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().int().min(0).max(6).nullable(),
);

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  pricePerNight: z.coerce.number().min(0),
  minNights: nights.optional(),
  maxNights: nights.optional(),
  checkInDay: weekday.optional(),
  checkOutDay: weekday.optional(),
  dateRanges: z
    .array(
      z.object({
        // "MM-DD" - seasons repeat every year. Full dates from older clients
        // are accepted and the year is dropped.
        startDate: monthDay,
        endDate: monthDay,
      }),
    )
    .min(1, "At least one date range is required"),
});

function checkNightRange(body) {
  if (body.minNights != null && body.maxNights != null && body.maxNights < body.minNights) {
    throw new ApiError("Max nights can't be less than min nights.", 422);
  }
}

export async function listSeasons(req, res, next) {
  try {
    await findViewableProperty(req.user, req.params.propertyId);
    const seasons = await prisma.season.findMany({
      where: { propertyId: req.params.propertyId },
      orderBy: { createdAt: "asc" },
    });
    return ok(res, seasons.map(serializeSeason));
  } catch (err) {
    next(err);
  }
}

export async function createSeason(req, res, next) {
  try {
    const body = seasonSchema.parse(req.body);
    checkNightRange(body);

    await findManagedProperty(req.user, req.params.propertyId);

    const season = await prisma.season.create({
      data: {
        propertyId: req.params.propertyId,
        name: body.name,
        pricePerNight: body.pricePerNight,
        dateRanges: body.dateRanges,
        minNights: body.minNights ?? null,
        maxNights: body.maxNights ?? null,
        checkInDay: body.checkInDay ?? null,
        checkOutDay: body.checkOutDay ?? null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Season created",
      data: serializeSeason(season),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSeason(req, res, next) {
  try {
    const body = seasonSchema.partial().parse(req.body);
    checkNightRange(body);
    await findManagedProperty(req.user, req.params.propertyId);

    const existing = await prisma.season.findFirst({
      where: { id: req.params.seasonId, propertyId: req.params.propertyId },
    });
    if (!existing) throw new ApiError("Season not found.", 404);

    const season = await prisma.season.update({
      where: { id: req.params.seasonId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.pricePerNight !== undefined && { pricePerNight: body.pricePerNight }),
        ...(body.dateRanges !== undefined && { dateRanges: body.dateRanges }),
        ...(body.minNights !== undefined && { minNights: body.minNights }),
        ...(body.maxNights !== undefined && { maxNights: body.maxNights }),
        ...(body.checkInDay !== undefined && { checkInDay: body.checkInDay }),
        ...(body.checkOutDay !== undefined && { checkOutDay: body.checkOutDay }),
      },
    });

    return ok(res, serializeSeason(season), "Season updated");
  } catch (err) {
    next(err);
  }
}

export async function removeSeason(req, res, next) {
  try {
    await findManagedProperty(req.user, req.params.propertyId);
    const existing = await prisma.season.findFirst({
      where: { id: req.params.seasonId, propertyId: req.params.propertyId },
    });
    if (!existing) throw new ApiError("Season not found.", 404);

    await prisma.season.delete({ where: { id: req.params.seasonId } });
    return ok(res, null, "Season deleted");
  } catch (err) {
    next(err);
  }
}
