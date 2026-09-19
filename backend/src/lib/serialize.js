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
    dateRanges: s.dateRanges ?? [],
  };
}

export function serializeBooking(b) {
  if (!b) return null;
  return {
    _id: b.id,
    bookingId: b.bookingId,
    propertyId: b.property ? serializeProperty(b.property) : b.propertyId,
    userId: b.user ? serializeUser(b.user) : null,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
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
