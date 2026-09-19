import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { serializeSeason } from "../lib/serialize.js";

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  pricePerNight: z.coerce.number().min(0),
  dateRanges: z
    .array(
      z.object({
        startDate: z.string().trim().min(1),
        endDate: z.string().trim().min(1),
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

    const property = await prisma.property.findUnique({ where: { id: req.params.propertyId } });
    if (!property) throw new ApiError("Property not found.", 404);

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
