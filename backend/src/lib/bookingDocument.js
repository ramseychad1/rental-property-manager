// Generates the booking confirmation + rental agreement PDF. Built from live
// data (booking snapshot, payment schedule, property rules text) so it never
// needs re-uploading when an owner changes prices or terms. booking must
// include `property`, `installments`, and ideally the property's `owner`.

import PDFDocument from "pdfkit";
import { fmtStayDate } from "./emailTemplates.js";
import { cleanForPdf } from "./textClean.js";
import { prisma } from "./prisma.js";
import { savePrivate, readPrivate, deletePrivate } from "./storage.js";

const money = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;
const INK = "#111827";
const MUTED = "#6b7280";
const RULE = "#d1d5db";

export const DEFAULT_RENTAL_AGREEMENT = `This agreement is between the Owner and the Renter named above for the stay described in this document.

1. Occupancy. The property may be occupied only by the guests included in the booking. The number of guests may not exceed the maximum occupancy.
2. Check-in and check-out. Check-in and check-out follow the dates above. Late check-out is not permitted without the Owner's written approval.
3. Payments. Payments are due on the dates in the payment schedule. This agreement is not binding until the signed copy and the first payment have been received and cleared.
4. Cancellation. Cancellations and early departures are handled per the Owner's policy; refunds are at the Owner's discretion.
5. Care of the property. The Renter is responsible for any damage beyond normal wear and tear during the stay and agrees to leave the property in a clean condition.
6. House rules. No smoking. No pets unless approved in writing. Respect quiet hours and the rules of the community.
7. Liability. The Owner is not liable for personal injury or loss of personal property during the stay.`;

function field(doc, label, value) {
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, { continued: true });
  doc.fillColor(INK).text(`  ${value}`);
}

function heading(doc, text) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(text);
  const y = doc.y + 2;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(RULE).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

// Two-column row: label left, amount right-aligned.
function row(doc, left, right, { bold = false } = {}) {
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(INK);
  doc.text(left, x, y, { width: w * 0.65 });
  const after = doc.y;
  doc.text(right, x + w * 0.65, y, { width: w * 0.35, align: "right" });
  doc.y = Math.max(after, doc.y);
  doc.x = x;
}

// A drawn checkbox (Helvetica has no check glyph) with the label and price.
function checkboxRow(doc, label, price, checked) {
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  const box = 10;
  doc.lineWidth(0.8).strokeColor(INK).rect(x, y + 1, box, box).stroke();
  if (checked) {
    doc.moveTo(x + 2, y + 3).lineTo(x + box - 2, y + box - 1).stroke();
    doc.moveTo(x + box - 2, y + 3).lineTo(x + 2, y + box - 1).stroke();
  }
  doc.font(checked ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(INK);
  doc.text(label, x + box + 8, y, { width: w * 0.65 - box - 8 });
  const after = doc.y;
  doc.text(price, x + w * 0.65, y, { width: w * 0.35, align: "right" });
  doc.y = Math.max(after, doc.y) + 2;
  doc.x = x;
}

function priceLines(b) {
  const pricing = b.pricing || {};
  const segments = pricing.segments || [];
  const out = segments.map((s) => [
    s.seasonName ? `${s.nights} nights @ ${money(s.pricePerNight)} (${s.seasonName})` : `${s.nights} nights @ ${money(s.pricePerNight)}`,
    money(s.subtotal),
  ]);
  if (pricing.cleaningFee) out.push(["Cleaning fee", money(pricing.cleaningFee)]);
  if (pricing.serviceFee) out.push(["Service fee", money(pricing.serviceFee)]);
  // One summed line; the individual add-ons are itemized in their own section.
  const addOnsTotal = (b.selectedAddOns?.length ? b.selectedAddOns : pricing.addOns || []).reduce((n, a) => n + (a.price || 0), 0);
  if (addOnsTotal) out.push(["Add-ons selected", money(addOnsTotal)]);
  if (pricing.taxes) out.push([`Taxes (${pricing.taxRate}%)`, money(pricing.taxes)]);
  return out;
}

export function buildBookingPdf(b) {
  const p = b.property;
  const owner = p.owner || b.owner || null;
  const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: `Booking confirmation ${b.bookingId}` } });
  // Every string drawn goes through the cleaner - owner-pasted rules text can
  // contain characters the built-in font can't render.
  const drawText = doc.text.bind(doc);
  doc.text = (str, ...args) => drawText(typeof str === "string" ? cleanForPdf(str) : str, ...args);
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // --- Page 1: confirmation ---
  doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text("Booking Confirmation");
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`Booking ID ${b.bookingId}`);

  heading(doc, "Property");
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(p.title);
  const address = [p.locationAddress, p.locationCity, p.locationZipCode, p.locationCountry].filter(Boolean).join(", ");
  if (address) doc.font("Helvetica").fontSize(10).fillColor(INK).text(address);
  if (owner) {
    doc.moveDown(0.4);
    field(doc, "Owner:", [owner.name, owner.email, owner.phone].filter(Boolean).join("  ·  "));
  }

  heading(doc, "Renter and stay");
  field(doc, "Renter:", [b.guestName, b.guestEmail, b.guestPhone].filter(Boolean).join("  ·  "));
  const renterAddress = [b.guestStreet, [b.guestCity, [b.guestState, b.guestZip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(", ");
  if (renterAddress) field(doc, "Address:", renterAddress);
  field(doc, "Check-in:", fmtStayDate(b.checkIn));
  field(doc, "Check-out:", fmtStayDate(b.checkOut));
  field(doc, "Nights:", String(b.totalNights));
  field(doc, "Guests:", `${b.guests} (${b.adults} adults${b.children ? `, ${b.children} children` : ""}${b.infants ? `, ${b.infants} infants` : ""})`);

  heading(doc, "Price");
  for (const [l, r] of priceLines(b)) row(doc, l, r);
  doc.moveDown(0.3);
  row(doc, "Total", money(b.totalAmount), { bold: true });

  // Every add-on the property offers as a checkbox list, ticked where the
  // renter selected it. Anything on the booking that the property has since
  // removed from its catalog is still listed (ticked) so the agreement matches
  // what was booked.
  const selected = b.selectedAddOns?.length ? b.selectedAddOns : b.pricing?.addOns || [];
  const offered = Array.isArray(p.addOns) ? p.addOns : [];
  const addOnList = [...offered, ...selected.filter((a) => !offered.some((o) => o.id === a.id))];
  if (addOnList.length) {
    heading(doc, "Add-ons Selected");
    for (const a of addOnList) {
      const checked = selected.some((x) => x.id === a.id);
      checkboxRow(doc, a.label, money(a.price), checked);
    }
  }

  const installments = b.installments || [];
  if (installments.length) {
    heading(doc, "Payment schedule");
    for (const i of installments) {
      const extra = i.includesDeposit ? ` (includes ${money(i.depositAmount)} security deposit)` : "";
      const due = i.paid ? `paid ${fmtStayDate(i.paidAt)}` : `due ${fmtStayDate(i.dueDate)}`;
      row(doc, `${i.label}${extra} - ${due}`, money(i.amount));
    }
    const dueNow = installments.filter((i) => !i.paid && new Date(i.dueDate) <= new Date());
    if (dueNow.length) {
      doc.moveDown(0.3);
      row(doc, "Total due now", money(dueNow.reduce((s, i) => s + i.amount, 0)), { bold: true });
    }
  }

  if (p.paymentInstructions?.trim()) {
    heading(doc, "Payment instructions");
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(p.paymentInstructions.trim());
  }

  // --- Rental agreement ---
  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text("Rental Agreement and House Rules");
  doc.moveDown(0.6);
  doc.font("Helvetica").fontSize(10).fillColor(INK).text((p.rentalAgreement || "").trim() || DEFAULT_RENTAL_AGREEMENT, { lineGap: 2 });

  // --- Signature ---
  doc.moveDown(2);
  if (doc.y > doc.page.height - 190) doc.addPage();
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(
    "By signing below, the Renter agrees to the terms of this booking and rental agreement.",
  );
  doc.moveDown(2.5);
  const left = doc.page.margins.left;
  const y = doc.y;
  doc.strokeColor(INK).lineWidth(0.5);
  doc.moveTo(left, y).lineTo(left + 260, y).stroke();
  doc.moveTo(left + 300, y).lineTo(left + 440, y).stroke();
  doc.fillColor(MUTED).fontSize(9).text("Renter signature", left, y + 4);
  doc.text("Date", left + 300, y + 4);
  doc.moveDown(1.5);
  doc.text(`Print name: ${b.guestName}`, left);

  doc.end();
  return done;
}

// Generates the PDF from current data and stores it on the booking, replacing
// any previous copy. Returns the PDF buffer.
export async function generateBookingDocument(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { include: { owner: true } }, installments: { orderBy: { order: "asc" } } },
  });
  const pdf = await buildBookingPdf(booking);
  const key = await savePrivate(pdf);
  await prisma.booking.update({ where: { id: bookingId }, data: { documentKey: key, documentGeneratedAt: new Date() } });
  await deletePrivate(booking.documentKey);
  return pdf;
}

// The stored PDF, generating it first if the booking has none.
export async function loadBookingDocument(booking) {
  const stored = booking.documentKey ? await readPrivate(booking.documentKey) : null;
  return stored || generateBookingDocument(booking.id);
}
