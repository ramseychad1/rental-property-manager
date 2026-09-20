import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { prisma } from "./prisma.js";
import { decrypt } from "./crypto.js";

// Sends email through a connected Gmail account (Gmail API, gmail.send scope).
// Sender choice: the owner's own connection if they have one, else the
// SuperAdmin's "system" connection, else nothing (logged to the console so dev
// and unconfigured deployments keep working). Never throws to callers.
//
// The two base URLs are overridable so tests can point at a local stub.

export const GOOGLE_OAUTH = process.env.GOOGLE_OAUTH_BASE || "https://oauth2.googleapis.com";
const GMAIL_API = process.env.GMAIL_API_BASE || "https://gmail.googleapis.com";

const tokenCache = new Map(); // connectionId -> { token, expiresAt }

class GoogleAuthError extends Error {} // token revoked/expired - needs reconnect

async function accessToken(conn) {
  const hit = tokenCache.get(conn.id);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const res = await fetch(`${GOOGLE_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: decrypt(conn.refreshTokenEnc),
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body.error === "invalid_grant") throw new GoogleAuthError(body.error_description || "Access was revoked or expired.");
    throw new Error(`Google token error: ${body.error || res.status}`);
  }
  tokenCache.set(conn.id, { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 });
  return body.access_token;
}

const base64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function buildRaw({ from, to, replyTo, subject, html, text }) {
  const mail = new MailComposer({ from, to, replyTo: replyTo || undefined, subject, html, text });
  return mail.compile().build();
}

async function gmailSend(conn, raw) {
  const token = await accessToken(conn);
  const res = await fetch(`${GMAIL_API}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64url(raw) }),
  });
  if (res.status === 401) {
    tokenCache.delete(conn.id);
    throw new GoogleAuthError("Gmail rejected the saved access.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Gmail send failed (${res.status}): ${body?.error?.message || "unknown error"}`);
  }
}

const log = (data) =>
  prisma.emailLog.create({ data }).catch((err) => console.error("[EMAIL] couldn't write log:", err.message));

export function getSystemConnection() {
  return prisma.emailConnection.findFirst({ where: { isSystem: true, status: "active" }, include: { user: true } });
}

/**
 * @param {object} m
 * @param {string} m.kind       label for the log ("booking-received", "otp", ...)
 * @param {string} m.to
 * @param {string} m.subject
 * @param {string} m.html
 * @param {string} m.text
 * @param {string} [m.ownerId]  user whose Gmail to prefer (property owner)
 * @param {string} [m.replyTo]  where replies should go (the owner's address)
 * @param {string} [m.fromName] display name; defaults to the connected user's name
 * @param {boolean} [m.systemOnly] never use an owner's connection (signup codes, ...)
 * @param {boolean} [m.strict]  only use ownerId's own connection, no fallback (test email)
 * @param {string} [m.bookingId]
 * @returns {Promise<{ok: boolean, status: string, via?: string, error?: string}>}
 */
export async function sendMail(m) {
  const base = { kind: m.kind, toEmail: m.to, subject: m.subject, bookingId: m.bookingId };
  try {
    const candidates = [];
    if (m.ownerId && !m.systemOnly) {
      const own = await prisma.emailConnection.findUnique({ where: { userId: m.ownerId }, include: { user: true } });
      if (own?.status === "active") candidates.push(own);
    }
    if (!m.strict) {
      const system = await getSystemConnection();
      if (system && !candidates.some((c) => c.id === system.id)) candidates.push(system);
    }

    if (process.env.EMAIL_DRY_RUN === "true") {
      const c = candidates[0];
      const from = c ? { name: m.fromName || c.user.name, address: c.email } : "dry-run@localhost";
      const raw = await buildRaw({ from, to: m.to, replyTo: m.replyTo, subject: m.subject, html: m.html, text: m.text });
      console.log(`\n[EMAIL DRY RUN] ${m.kind} via ${c?.email || "(no sender)"}\n${raw.toString()}\n`);
      await log({ ...base, status: "skipped", error: "dry run", connectionId: c?.id });
      return { ok: true, status: "skipped", via: c?.email };
    }

    if (candidates.length === 0) {
      console.log(`\n[EMAIL] no Gmail connected - not sent. ${m.kind} to ${m.to}: ${m.subject}\n${m.text}\n`);
      await log({ ...base, status: "skipped", error: "no connected sender" });
      return { ok: false, status: "skipped", error: "No Gmail account is connected." };
    }

    let lastError = "";
    for (const conn of candidates) {
      try {
        const raw = await buildRaw({
          from: { name: m.fromName || conn.user.name, address: conn.email },
          to: m.to,
          replyTo: m.replyTo,
          subject: m.subject,
          html: m.html,
          text: m.text,
        });
        await gmailSend(conn, raw);
        await log({ ...base, status: "sent", connectionId: conn.id });
        return { ok: true, status: "sent", via: conn.email };
      } catch (err) {
        lastError = err.message;
        if (err instanceof GoogleAuthError) {
          await prisma.emailConnection
            .update({ where: { id: conn.id }, data: { status: "needs_reconnect", lastError: err.message } })
            .catch(() => {});
        }
        await log({ ...base, status: "failed", error: err.message, connectionId: conn.id });
      }
    }
    return { ok: false, status: "failed", error: lastError };
  } catch (err) {
    console.error("[EMAIL] unexpected error:", err);
    await log({ ...base, status: "failed", error: err.message });
    return { ok: false, status: "failed", error: err.message };
  }
}
