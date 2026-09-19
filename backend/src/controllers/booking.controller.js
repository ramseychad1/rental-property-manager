import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { serializeBooking } from "../lib/serialize.js";

const HELD_STATUSES = ["pending", "accepted", "booked"];

function generateBookingId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SN-${stamp}-${rand}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffNights(checkIn, checkOut) {
  const MS_DAY = 86_400_000;
  return Math.round((startOfDay(checkOut) - startOfDay(checkIn)) / MS_DAY);
}

async function computePricing(propertyId, checkIn, checkOut) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new ApiError("Property not found.", 404);

  const seasons = await prisma.season.findMany({ where: { propertyId } });

  const nights = diffNights(checkIn, checkOut);
  if (nights <= 0) throw new ApiError("Check-out must be after check-in.", 400);
  if (nights < property.minNights) {
    throw new ApiError(`This property requires a minimum stay of ${property.minNights} nights.`, 400);
  }

  const segments = [];
  const cursor = startOfDay(checkIn);
  const end = startOfDay(checkOut);

  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10);
    const season = seasons.find((s) =>
      (s.dateRanges || []).some((r) => key >= r.startDate.slice(0, 10) && key <= r.endDate.slice(0, 10)),
    );
    const seasonId = season?.id ?? "__default__";
    const pricePerNight = season?.pricePerNight ?? property.priceNightly;

    const last = segments[segments.length - 1];
    if (last && last.seasonId === seasonId) {
      last.nights += 1;
      last.subtotal += pricePerNight;
    } else {
      segments.push({ seasonId, seasonName: season?.name ?? null, pricePerNight, nights: 1, subtotal: pricePerNight });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const subTotal = segments.reduce((sum, s) => sum + s.subtotal, 0);
  const taxes = Math.round(((subTotal + property.priceCleaningFee + property.priceServiceFee) * property.priceTaxRate) / 100);
  const total = subTotal + property.priceCleaningFee + property.priceServiceFee + taxes;

  return {
    property,
    nights,
    pricing: {
      segments,
      subTotal,
      cleaningFee: property.priceCleaningFee,
      serviceFee: property.priceServiceFee,
      taxes,
      taxRate: property.priceTaxRate,
      total,
    },
  };
}

const createBookingSchema = z.object({
  checkIn: z.string().trim().min(1),
  checkOut: z.string().trim().min(1),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  infants: z.coerce.number().int().min(0).default(0),
  guests: z.coerce.number().int().min(1).optional(),
  guestInfo: z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email(),
    phone: z.string().trim().optional().default(""),
    country: z.string().trim().optional(),
  }),
  notes: z.string().trim().optional().default(""),
});

export async function createBooking(req, res, next) {
  try {
    const body = createBookingSchema.parse(req.body);
    const propertyId = req.params.propertyId;

    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);

    const overlapping = await prisma.booking.count({
      where: {
        propertyId,
        bookingStatus: { in: HELD_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlapping > 0) throw new ApiError("Those dates are no longer available.", 409);

    const { nights, pricing } = await computePricing(propertyId, checkIn, checkOut);
    const guests = body.guests ?? body.adults + body.children + body.infants;

    const booking = await prisma.booking.create({
      data: {
        bookingId: generateBookingId(),
        propertyId,
        userId: req.user?.id ?? null,
        checkIn,
        checkOut,
        adults: body.adults,
        children: body.children,
        infants: body.infants,
        guests,
        totalNights: nights,
        guestName: body.guestInfo.name,
        guestEmail: body.guestInfo.email,
        guestPhone: body.guestInfo.phone || null,
        notes: body.notes,
        pricing,
        totalAmount: pricing.total,
      },
      include: { property: true, user: true },
    });

    return res.status(201).json({
      success: true,
      message: "Booking confirmed",
      data: serializeBooking(booking),
    });
  } catch (err) {
    next(err);
  }
}

export async function listBookings(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const { bookingStatus, paymentStatus, propertyId, search } = req.query;

    const where = {};
    if (bookingStatus && bookingStatus !== "all") where.bookingStatus = bookingStatus;
    if (paymentStatus && paymentStatus !== "all") where.paymentStatus = paymentStatus;
    if (propertyId) where.propertyId = propertyId;
    if (search) {
      where.OR = [
        { bookingId: { contains: String(search), mode: "insensitive" } },
        { guestName: { contains: String(search), mode: "insensitive" } },
        { guestEmail: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { property: true, user: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return ok(res, {
      bookings: bookings.map(serializeBooking),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { property: true, user: true },
    });
    if (!booking) throw new ApiError("Booking not found.", 404);

    const isOwner = booking.userId && booking.userId === req.user.id;
    if (req.user.role !== "Admin" && !isOwner) {
      throw new ApiError("Booking not found.", 404);
    }

    return ok(res, serializeBooking(booking));
  } catch (err) {
    next(err);
  }
}

async function transition(req, res, next, data, message) {
  try {
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError("Booking not found.", 404);

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { property: true, user: true },
    });

    return ok(res, serializeBooking(booking), message);
  } catch (err) {
    next(err);
  }
}

export const acceptBooking = (req, res, next) =>
  transition(req, res, next, { bookingStatus: "accepted" }, "Booking accepted");

export const rejectBooking = (req, res, next) =>
  transition(req, res, next, { bookingStatus: "rejected" }, "Booking rejected");

export async function cancelBooking(req, res, next) {
  const schema = z.object({
    cancelledBy: z.string().trim().optional().default("host"),
    cancellationReason: z.string().trim().optional(),
  });
  const body = schema.parse(req.body);
  return transition(
    req,
    res,
    next,
    { bookingStatus: "cancelled", cancelledBy: body.cancelledBy, cancellationReason: body.cancellationReason },
    "Booking cancelled",
  );
}

export async function setPaymentStatus(req, res, next) {
  const schema = z.object({ paymentStatus: z.enum(["pending", "paid", "refunded"]) });
  const { paymentStatus } = schema.parse(req.body);

  try {
    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError("Booking not found.", 404);

    const data = { paymentStatus };
    if (paymentStatus === "paid" && existing.bookingStatus === "accepted") {
      data.bookingStatus = "booked";
    }
    if (paymentStatus === "refunded" && existing.bookingStatus !== "cancelled") {
      data.bookingStatus = "cancelled";
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { property: true, user: true },
    });

    return ok(res, serializeBooking(booking), "Payment status updated");
  } catch (err) {
    next(err);
  }
}

const RANGE_LABELS = {
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
};

function resolveRange(query) {
  const now = new Date();
  const { range = "last_8_months", month, year } = query;

  if (range === "month" && month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    return { start, end, bucket: "day", label: start.toLocaleString("en-US", { month: "long", year: "numeric" }) };
  }

  if (range === "year" && year) {
    const y = Number(year);
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), bucket: "month", label: String(y) };
  }

  if (range === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end, bucket: "day", label: RANGE_LABELS.this_month };
  }

  if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end, bucket: "day", label: RANGE_LABELS.last_month };
  }

  if (range === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end, bucket: "month", label: RANGE_LABELS.this_year };
  }

  if (range === "last_year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear(), 0, 1);
    return { start, end, bucket: "month", label: RANGE_LABELS.last_year };
  }

  // last_8_months (default)
  const start = new Date(now.getFullYear(), now.getMonth() - 7, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, bucket: "month", label: "Last 8 months" };
}

export async function analytics(req, res, next) {
  try {
    const { start, end, bucket, label } = resolveRange(req.query);

    const [totalProperties, activeProperties, totalUsers, bookingsInRange] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { status: "active" } }),
      prisma.user.count(),
      prisma.booking.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { property: true, user: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalBookings = bookingsInRange.length;
    const pendingBookings = bookingsInRange.filter((b) => b.bookingStatus === "pending").length;
    const totalRevenue = bookingsInRange
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const buckets = new Map();
    const cursor = new Date(start);
    while (cursor < end) {
      const key =
        bucket === "day"
          ? cursor.toISOString().slice(0, 10)
          : `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const bucketLabel =
        bucket === "day"
          ? cursor.toLocaleDateString("en-US", { day: "numeric", month: "short" })
          : cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      buckets.set(key, { label: bucketLabel, revenue: 0, bookings: 0 });
      cursor.setDate(cursor.getDate() + (bucket === "day" ? 1 : 0));
      if (bucket === "month") cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const b of bookingsInRange) {
      const key =
        bucket === "day"
          ? b.createdAt.toISOString().slice(0, 10)
          : `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const row = buckets.get(key);
      if (row) {
        row.bookings += 1;
        if (b.paymentStatus === "paid") row.revenue += b.totalAmount;
      }
    }

    const statusCounts = {};
    for (const b of bookingsInRange) {
      statusCounts[b.bookingStatus] = (statusCounts[b.bookingStatus] || 0) + 1;
    }
    const bookingStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    return ok(res, {
      summary: { totalProperties, activeProperties, totalBookings, pendingBookings, totalUsers, totalRevenue },
      charts: { series: Array.from(buckets.values()), bookingStatus },
      recentBookings: bookingsInRange.slice(0, 8).map(serializeBooking),
      filters: { label },
    });
  } catch (err) {
    next(err);
  }
}
