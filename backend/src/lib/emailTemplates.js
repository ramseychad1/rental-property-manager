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

// Only http(s) links, trailing slash trimmed; anything else is dropped so a bad
// config value can never produce a broken or unsafe link.
export const cleanUrl = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u).replace(/\/+$/, "") : "");

function layout({ heading, intro, rows = [], outro = "", cta = null, brand = "Rental Property Manager" }) {
  const link = cta && cleanUrl(cta.url) ? { label: cta.label, url: cleanUrl(cta.url) } : null;
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
${link ? `<p style="margin:0 0 16px"><a href="${esc(link.url)}" style="display:inline-block;background:#0b7c83;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px">${esc(link.label)}</a></p><p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all">Or copy this link: ${esc(link.url)}</p>` : ""}
${outro ? `<p style="margin:0;font-size:15px;line-height:1.5">${outro}</p>` : ""}
</div>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;color:#9ca3af;text-align:center">${esc(brand)}</p>
</body></html>`;
  const text = [heading, "", stripTags(intro), "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(link ? ["", `${link.label}: ${link.url}`] : []), "", stripTags(outro)]
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

// A property with a payment schedule: rows breaking down what's due right now
// (bundling every term already past when the owner accepted, per term) and
// what's still upcoming. Called with the raw installment rows on the booking
// (see acceptBooking) - empty/undefined when the property has no schedule.
function paymentScheduleRows(installments) {
  if (!installments || installments.length === 0) return [];
  const now = new Date();
  const dueNow = installments.filter((i) => new Date(i.dueDate) <= now);
  const upcoming = installments.filter((i) => new Date(i.dueDate) > now);
  const rows = [];

  if (dueNow.length) {
    rows.push(["Due now", ""]);
    for (const i of dueNow) {
      const extra = i.includesDeposit ? ` (includes ${money(i.depositAmount)} security deposit)` : "";
      rows.push([`– ${i.label}`, `${money(i.amount)}${extra}`]);
    }
    if (dueNow.length > 1) {
      rows.push(["Total due now", money(dueNow.reduce((s, i) => s + i.amount, 0))]);
    }
  }

  if (upcoming.length) {
    rows.push(["Upcoming payments", ""]);
    for (const i of upcoming) {
      rows.push([`– ${i.label}`, `${money(i.amount)} - due ${fmtStayDate(i.dueDate)}`]);
    }
  }

  return rows;
}

export function guestBookingEmail(event, b, p, { ownerName, siteUrl } = {}) {
  const who = esc(b.guestName);
  const contact = ownerName ? ` If you have questions, just reply to this email.` : "";
  const scheduleRows = event === "accepted" ? paymentScheduleRows(b.installments) : [];
  const copy = {
    received: {
      subject: `We received your booking request - ${p.title}`,
      heading: "Booking request received",
      intro: `Hi ${who}, thanks for your request. The owner will review it and you'll hear back shortly.${contact}`,
    },
    accepted: {
      subject: `Your booking is accepted - ${p.title}`,
      heading: "Booking accepted",
      intro: `Hi ${who}, good news - your booking has been accepted.${
        scheduleRows.length ? " Here's your payment schedule, including what's due now." : ""
      }${contact}`,
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
  const site = cleanUrl(siteUrl);
  const cta = site
    ? event === "rejected" || event === "cancelled" || event === "refunded"
      ? { label: "Browse other dates or properties", url: `${site}/properties` }
      : { label: "View my booking", url: `${site}/bookings` }
    : null;
  return {
    subject: copy.subject,
    ...layout({ heading: copy.heading, intro: copy.intro, rows: [...stayRows(b, p), ...scheduleRows], cta }),
  };
}

export function ownerNewBookingEmail(b, p, { adminUrl } = {}) {
  const admin = cleanUrl(adminUrl);
  return {
    subject: `New booking request - ${p.title}`,
    ...layout({
      heading: "New booking request",
      intro: `${esc(b.guestName)} (${esc(b.guestEmail)}${b.guestPhone ? `, ${esc(b.guestPhone)}` : ""}) requested a stay.`,
      rows: [...stayRows(b, p), ...(b.notes ? [["Notes", b.notes]] : [])],
      cta: admin ? { label: "Review this booking", url: `${admin}/bookings` } : null,
      outro: admin ? "" : "Review it in your admin panel.",
    }),
  };
}

export function inviteEmail({ ownerName, inviteeName, inviteUrl, days }) {
  const owner = esc(ownerName || "A property owner");
  return {
    subject: `${ownerName || "A property owner"} invited you to view their private properties`,
    ...layout({
      heading: "You're invited",
      intro: `${inviteeName ? `Hi ${esc(inviteeName)}, ` : ""}${owner} has invited you to view and request stays at their private properties. Accept the invitation to create your account (or sign in if you already have one). You'll then see their private properties alongside the public ones every time you visit.`,
      cta: { label: "Accept invitation", url: inviteUrl },
      outro: `This link works once and expires in ${days} days. If you weren't expecting this invitation, you can ignore this email.`,
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

export function credentialsEmail({ name, loginUrl, email, tempPassword, reset }) {
  return {
    subject: reset ? "Your Rental Property Manager password was reset" : "Your Rental Property Manager account",
    ...layout({
      heading: reset ? "Your password was reset" : "Your account is ready",
      intro: `Hi ${esc(name)}, ${reset ? "your password was reset by an administrator." : "an administrator created an account for you."} Sign in with the details below. You'll be asked to choose your own password the first time.`,
      rows: [["Login URL", loginUrl], ["User ID", email], ["Temporary password", tempPassword]],
      cta: { label: "Sign in", url: loginUrl },
      outro: "The temporary password stops working once you set your own. If you weren't expecting this email, you can ignore it.",
    }),
  };
}
