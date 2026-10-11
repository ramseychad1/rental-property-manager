// Marking installments paid keeps the booking's own paymentStatus in step.
// Local database only.
import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl)) throw new Error("installment tests only run against a local database.");

const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
const { invalidateSiteCache } = await import("../src/lib/siteResolver.js");

const PASSWORD = "Test1234!";
const OWNER_EMAIL = "xi-owner@example.com";
let server, base, cookie, site, booking, inst;

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: "xi-" } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.booking.deleteMany({ where: { property: { ownerId: { in: ids } } } });
  await prisma.property.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.site.deleteMany({ where: { slug: "xi-a" } });
  invalidateSiteCache();
}

const mark = (i, paid) =>
  fetch(`${base}/api/booking/${booking.id}/installments/${i.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ paid }),
  });
const state = () => prisma.booking.findUnique({ where: { id: booking.id } });

before(async () => {
  await cleanup();
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  site = await prisma.site.create({ data: { slug: "xi-a", name: "XI A" } });
  const owner = await prisma.user.create({
    data: {
      name: "xi owner",
      email: OWNER_EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: "Owner",
      isVerified: true,
      memberships: { create: { siteId: site.id, role: "Owner" } },
    },
  });
  const property = await prisma.property.create({
    data: { title: "xi-property", siteId: site.id, ownerId: owner.id, status: "active" },
  });
  booking = await prisma.booking.create({
    data: {
      bookingId: `XI-${crypto.randomUUID().slice(0, 6)}`,
      propertyId: property.id,
      checkIn: new Date("2027-01-10"),
      checkOut: new Date("2027-01-12"),
      totalNights: 2,
      guestName: "Guest",
      guestEmail: "xi-guest@example.com",
      pricing: {},
      totalAmount: 100,
      bookingStatus: "accepted",
    },
  });
  inst = [];
  for (const [order, label] of [[0, "First"], [1, "Final"]]) {
    inst.push(
      await prisma.bookingInstallment.create({
        data: { bookingId: booking.id, order, label, percent: 50, amount: 50, dueDate: new Date("2026-12-01") },
      }),
    );
  }
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, password: PASSWORD }),
  });
  cookie = r.headers.get("set-cookie").split(";")[0];
});

after(async () => {
  server?.close();
  await cleanup();
  await prisma.$disconnect();
});

test("paymentStatus follows the schedule: pending until every installment is paid", async () => {
  assert.equal((await mark(inst[0], true)).status, 200);
  let b = await state();
  assert.equal(b.bookingStatus, "booked");
  assert.equal(b.paymentStatus, "pending");

  assert.equal((await mark(inst[1], true)).status, 200);
  b = await state();
  assert.equal(b.paymentStatus, "paid");

  assert.equal((await mark(inst[1], false)).status, 200);
  b = await state();
  assert.equal(b.paymentStatus, "pending");
});
