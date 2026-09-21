import { normalizeMD } from "./seasonRange.js";

export const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : d);

// The frontend and admin panel were originally built against a Mongoose/Mongo
// API and still expect Mongo-shaped JSON (`_id`, nested nested `price`/
// `images`/`location` objects, populated `userId`/`propertyId` sub-documents
// on bookings). These helpers translate our flat Postgres/Prisma rows into
// that exact shape so neither frontend app needed to change.

export function serializeUser(u) {
  if (!u) return null;
  return {
    _id: u.id,
    // Also expose plain `id` - the admin panel's UserList.jsx uses `u.id`
    // (inconsistent with the `_id` convention everywhere else in that app,
    // likely an oversight in the original code) for row keys/data-testid.
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    picture: u.picture ?? null,
    role: u.role,
    isVerified: u.isVerified,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt,
  };
}

export function serializeProperty(p) {
  if (!p) return null;
  return {
    _id: p.id,
    title: p.title,
    description: p.description ?? "",
    status: p.status,
    isPrivate: p.isPrivate ?? false,
    ownerId: p.ownerId ?? null,
    // Only present when the query loaded the owner (Super Admin list view); null = unassigned.
    ...(p.owner !== undefined && { owner: p.owner ? { _id: p.owner.id, name: p.owner.name, email: p.owner.email } : null }),
    minNights: p.minNights,
    maxNights: p.maxNights ?? null,
    guests: p.guests,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    rating: p.rating,
    amenities: p.amenities ?? [],
    location: {
      address: p.locationAddress ?? "",
      city: p.locationCity ?? "",
      country: p.locationCountry ?? "",
      zipCode: p.locationZipCode ?? "",
      url: p.locationUrl ?? "",
    },
    price: {
      nightly: p.priceNightly,
      currency: p.priceCurrency,
      cleaningFee: p.priceCleaningFee,
      serviceFee: p.priceServiceFee,
      taxRate: p.priceTaxRate,
    },
    images: {
      thumbnail: p.thumbnailUrl ?? null,
      gallery: p.gallery ?? [],
    },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeSeason(s) {
  if (!s) return null;
  return {
    _id: s.id,
    propertyId: s.propertyId,
    name: s.name,
    pricePerNight: s.pricePerNight,
    minNights: s.minNights ?? null,
    maxNights: s.maxNights ?? null,
    checkInDay: s.checkInDay ?? null,
    checkOutDay: s.checkOutDay ?? null,
    // Ranges are month/day only and repeat yearly; strip the year from legacy rows.
    dateRanges: (s.dateRanges ?? []).map((r) => ({
      startDate: normalizeMD(r.startDate),
      endDate: normalizeMD(r.endDate),
    })),
  };
}

export function serializeBooking(b) {
  if (!b) return null;
  return {
    _id: b.id,
    bookingId: b.bookingId,
    propertyId: b.property ? serializeProperty(b.property) : b.propertyId,
    userId: b.user ? serializeUser(b.user) : null,
    // Calendar dates ("YYYY-MM-DD"), not instants - see fmtDate/formatDate for why.
    checkIn: dateOnly(b.checkIn),
    checkOut: dateOnly(b.checkOut),
    adults: b.adults,
    children: b.children,
    infants: b.infants,
    guests: b.guests,
    totalNights: b.totalNights,
    guestInfo: {
      name: b.guestName,
      email: b.guestEmail,
      phone: b.guestPhone ?? "",
    },
    notes: b.notes ?? "",
    pricing: b.pricing ?? null,
    totalAmount: b.totalAmount,
    bookingStatus: b.bookingStatus,
    paymentStatus: b.paymentStatus,
    cancelledBy: b.cancelledBy ?? null,
    cancellationReason: b.cancellationReason ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function serializeThingToDo(t) {
  if (!t) return null;
  return {
    _id: t.id,
    name: t.name,
    description: t.description ?? "",
    category: t.category,
    area: t.area ?? "",
    location: { address: t.locationAddress ?? "", url: t.locationUrl ?? "" },
    image: t.imageUrl ?? "",
    status: t.status,
    createdAt: t.createdAt,
  };
}
