-- Bookings with a payment schedule whose installments are all paid but whose
-- own paymentStatus was never moved off "pending" (markInstallmentPaid didn't
-- update it). Cancelled/refunded bookings are left alone.
UPDATE "Booking" b
SET "paymentStatus" = 'paid'
WHERE b."paymentStatus" = 'pending'
  AND b."bookingStatus" NOT IN ('cancelled', 'rejected')
  AND EXISTS (SELECT 1 FROM "BookingInstallment" i WHERE i."bookingId" = b.id)
  AND NOT EXISTS (SELECT 1 FROM "BookingInstallment" i WHERE i."bookingId" = b.id AND NOT i.paid);
