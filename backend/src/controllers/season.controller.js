import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { serializeSeason } from "../lib/serialize.js";
import { normalizeMD, isValidMD } from "../lib/seasonRange.js";
import { findManagedProperty } from "../lib/access.js";

const monthDay = z
  .string()
  .trim()
  .transform(normalizeMD)
  .refine(isValidMD, "Use a real month and day (MM-DD)");

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  pricePerNight: z.coerce.number().min(0),
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

export async function listSeasons(req, res, next) {
  try {
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

    await findManagedProperty(req.user, req.params.propertyId);

    const season = await prisma.season.create({
      data: {
        propertyId: req.params.propertyId,
        name: body.name,
        pricePerNight: body.pricePerNight,
        dateRanges: body.dateRanges,
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
