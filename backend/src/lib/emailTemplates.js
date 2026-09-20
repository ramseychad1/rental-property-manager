// Plain, table-free HTML emails with inline styles (mail clients ignore
// <style> blocks inconsistently). Every template returns { subject, html, text }.
// All user-supplied text goes through esc().

export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Stay dates are calendar dates stored at UTC midnight - format them in UTC so
// they never shift a day (same rule as the apps' fmtDate/formatDate).
export const fmtStayDate = (d) =>
  new Date(`${new Date(d).toISOString().slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const money = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

function layout({ heading, intro, rows = [], outro = "", brand = "Rental Property Manager" }) {
  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-size:14px;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:14px;color:#111827">${esc(v)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;color:#111827">
<h1 style="margin:0 0 12px;font-size:20px">${esc(heading)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${intro}</p>
${rows.length ? `<table style="border-collapse:collapse;margin:0 0 16px">${rowHtml}</table>` : ""}
${outro ? `<p style="margin:0;font-size:15px;line-height:1.5">${outro}</p>` : ""}
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;color:#9ca3af;text-align:center">${esc(brand)}</p>
</body></html>`;
  const text = [heading, "", stripTags(intro), "", ...rows.map(([k, v]) => `${k}: ${v}`), "", stripTags(outro)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { html, text };
}

const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const stayRows = (b, p) => [
  ["Property", p.title],
  ["Check-in", fmtStayDate(b.checkIn)],
  ["Check-out", fmtStayDate(b.checkOut)],
  ["Nights", b.totalNights],
  ["Guests", b.guests],
  ["Total", money(b.totalAmount)],
  ["Booking ID", b.bookingId],
];

export function guestBookingEmail(event, b, p, { ownerName } = {}) {
  const who = esc(b.guestName);
  const contact = ownerName ? ` If you have questions, just reply to this email.` : "";
  const copy = {
    received: {
      subject: `We received your booking request - ${p.title}`,
      heading: "Booking request received",
      intro: `Hi ${who}, thanks for your request. The owner will review it and you'll hear back shortly.${contact}`,
    },
    accepted: {
      subject: `Your booking is accepted - ${p.title}`,
      heading: "Booking accepted",
      intro: `Hi ${who}, good news - your booking has been accepted.${contact}`,
    },
    rejected: {
      subject: `Update on your booking request - ${p.title}`,
      heading: "Booking not accepted",
      intro: `Hi ${who}, unfortunately the owner couldn't accept this booking request.${contact}`,
    },
    cancelled: {
      subject: `Your booking was cancelled - ${p.title}`,
      heading: "Booking cancelled",
      intro: `Hi ${who}, your booking has been cancelled.${b.cancellationReason ? ` Reason: ${esc(b.cancellationReason)}.` : ""}${contact}`,
    },
    paid: {
      subject: `Payment received - ${p.title}`,
      heading: "Payment received",
      intro: `Hi ${who}, we've received your payment. Your stay is confirmed.${contact}`,
    },
    refunded: {
      subject: `Your payment was refunded - ${p.title}`,
      heading: "Payment refunded",
      intro: `Hi ${who}, your payment has been refunded and the booking is cancelled.${contact}`,
    },
  }[event];
  return { subject: copy.subject, ...layout({ heading: copy.heading, intro: copy.intro, rows: stayRows(b, p) }) };
}

export function ownerNewBookingEmail(b, p, { adminUrl } = {}) {
  const link = adminUrl ? `<a href="${esc(adminUrl)}/bookings">Review it in your admin</a>.` : "Review it in your admin panel.";
  return {
    subject: `New booking request - ${p.title}`,
    ...layout({
      heading: "New booking request",
      intro: `${esc(b.guestName)} (${esc(b.guestEmail)}${b.guestPhone ? `, ${esc(b.guestPhone)}` : ""}) requested a stay.`,
      rows: [...stayRows(b, p), ...(b.notes ? [["Notes", b.notes]] : [])],
      outro: link,
    }),
  };
}

export function otpEmail(purpose, code) {
  const reset = purpose === "PASSWORD_RESET";
  return {
    subject: reset ? "Your password reset code" : "Your verification code",
    ...layout({
      heading: reset ? "Reset your password" : "Verify your email",
      intro: `Your code is <strong style="font-size:22px;letter-spacing:3px">${esc(code)}</strong>. It expires in 10 minutes.`,
      outro: "If you didn't request this, you can ignore this email.",
    }),
  };
}

export function contactEmail({ name, email, phone, message }) {
  return {
    subject: `Contact form message from ${name}`,
    ...layout({
      heading: "New contact form message",
      intro: `${esc(message).replace(/\n/g, "<br>")}`,
      rows: [["Name", name], ["Email", email], ...(phone ? [["Phone", phone]] : [])],
      outro: "Reply to this email to answer them directly.",
    }),
  };
}

export function testEmail(address) {
  return {
    subject: "Test email from Rental Property Manager",
    ...layout({
      heading: "It works",
      intro: `This test message was sent through your connected Gmail (${esc(address)}). Guest emails will come from this address.`,
    }),
  };
}
