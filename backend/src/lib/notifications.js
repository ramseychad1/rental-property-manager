import { prisma } from "./prisma.js";
import { sendMail, getSystemConnection } from "./mailer.js";
import { guestBookingEmail, ownerNewBookingEmail, otpEmail, contactEmail } from "./emailTemplates.js";

// Fire-and-forget wrappers around sendMail. Callers do `void notifyX(...)`
// after they've responded, so a mail problem can never fail a request.

const swallow = (label) => (err) => console.error(`[EMAIL] ${label} failed:`, err.message);

async function ownerOf(property) {
  return property.ownerId ? prisma.user.findUnique({ where: { id: property.ownerId } }) : null;
}

// booking must include `property`.
export async function notifyBookingCreated(booking) {
  try {
    const p = booking.property;
    const owner = await ownerOf(p);

    const guest = guestBookingEmail("received", booking, p, { ownerName: owner?.name });
    await sendMail({
      kind: "booking-received", to: booking.guestEmail, ...guest,
      ownerId: p.ownerId, replyTo: owner?.email, bookingId: booking.id,
    });

    // Unassigned property: alert the system sender's own address instead.
    const ownerTo = owner?.email || (await getSystemConnection())?.email;
    if (ownerTo) {
      const alert = ownerNewBookingEmail(booking, p, { adminUrl: process.env.ADMIN_URL });
      await sendMail({ kind: "owner-new-booking", to: ownerTo, ...alert, ownerId: p.ownerId, bookingId: booking.id });
    }
  } catch (err) {
    swallow("booking created")(err);
  }
}

// event: accepted | rejected | cancelled | paid | refunded
export async function notifyBookingEvent(event, booking) {
  try {
    const p = booking.property;
    const owner = await ownerOf(p);
    const mail = guestBookingEmail(event, booking, p, { ownerName: owner?.name });
    await sendMail({
      kind: `booking-${event}`, to: booking.guestEmail, ...mail,
      ownerId: p.ownerId, replyTo: owner?.email, bookingId: booking.id,
    });
  } catch (err) {
    swallow(`booking ${event}`)(err);
  }
}

// Codes always go out through the system sender - there's no owner context.
export async function notifyOtp(email, purpose, code) {
  try {
    const mail = otpEmail(purpose, code);
    return await sendMail({ kind: `otp-${purpose.toLowerCase()}`, to: email, systemOnly: true, ...mail });
  } catch (err) {
    swallow("otp")(err);
  }
}

export async function notifyContact(body) {
  try {
    const to = process.env.CONTACT_TO_EMAIL || (await getSystemConnection())?.email;
    if (!to) {
      console.log("\n[CONTACT] No CONTACT_TO_EMAIL or system sender - message only logged:", body, "\n");
      return;
    }
    const mail = contactEmail(body);
    await sendMail({ kind: "contact", to, systemOnly: true, replyTo: body.email, ...mail });
  } catch (err) {
    swallow("contact")(err);
  }
}
