// Security deposit: charged on top of the rental total, in the single payment
// or the first installment, and shown explicitly. Pure functions - no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInstallments, bookingDeposit, depositFor } from "../src/lib/paymentSchedule.js";
import { guestBookingEmail } from "../src/lib/emailTemplates.js";
import { serializeBooking } from "../src/lib/serialize.js";

const terms = [
  { id: "a", label: "First", percent: 50, dueType: "immediate", offset: 0 },
  { id: "b", label: "Final", percent: 50, dueType: "months_before_checkin", offset: 1 },
];
const property = { paymentTerms: terms, depositEnabled: true, depositAmount: 200 };
const checkIn = new Date("2027-03-01");

test("depositFor: only when enabled with an amount", () => {
  assert.equal(depositFor(property), 200);
  assert.equal(depositFor({ ...property, depositEnabled: false }), 0);
  assert.equal(depositFor({ ...property, depositAmount: 0 }), 0);
});

test("schedule: deposit lands in the first installment and the installments sum to total + deposit", () => {
  const rows = buildInstallments({ property, checkIn, total: 1379 });
  assert.equal(rows[0].includesDeposit, true);
  assert.equal(rows[0].depositAmount, 200);
  assert.equal(rows[0].amount, 690 + 200);
  assert.equal(rows[1].includesDeposit, false);
  assert.equal(rows.reduce((s, r) => s + r.amount, 0), 1379 + 200);
});

test("schedule: an explicit deposit overrides the property's current setting", () => {
  const rows = buildInstallments({ property, checkIn, total: 1000, deposit: 0 });
  assert.equal(rows.reduce((s, r) => s + r.amount, 0), 1000);
  assert.equal(rows[0].includesDeposit, false);
});

test("bookingDeposit: snapshot first, installments for older bookings, else 0", () => {
  assert.equal(bookingDeposit({ pricing: { depositAmount: 200 } }), 200);
  assert.equal(bookingDeposit({ pricing: {}, installments: [{ depositAmount: 200 }, { depositAmount: 0 }] }), 200);
  assert.equal(bookingDeposit({ pricing: {} }), 0);
});

const booking = (pricing, extra = {}) => ({
  id: "x",
  bookingId: "SN-TEST",
  guestName: "Pat",
  guestEmail: "pat@example.com",
  checkIn,
  checkOut: new Date("2027-03-05"),
  totalNights: 4,
  guests: 2,
  totalAmount: 1379,
  pricing: { segments: [], total: 1379, ...pricing },
  ...extra,
});

test("single payment (no schedule): the API reports the deposit and total due", () => {
  const out = serializeBooking(booking({ depositAmount: 200 }));
  assert.equal(out.totalAmount, 1379);
  assert.equal(out.pricing.depositAmount, 200);
  assert.equal(out.pricing.totalDue, 1579);
  assert.equal(serializeBooking(booking({})).pricing.totalDue, 1379);
});

test("emails: deposit and total due are explicit lines; no deposit means a plain Total", () => {
  const p = { title: "Test Property" };
  const withDeposit = guestBookingEmail("received", booking({ depositAmount: 200 }), p);
  assert.match(withDeposit.text, /Rental total: \$1,379/);
  assert.match(withDeposit.text, /Security deposit: \$200/);
  assert.match(withDeposit.text, /Total due: \$1,579/);
  const without = guestBookingEmail("received", booking({}), p);
  assert.match(without.text, /Total: \$1,379/);
  assert.doesNotMatch(without.text, /Security deposit/);
});
