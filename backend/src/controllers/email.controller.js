import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ok, ApiError } from "../lib/response.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { sendMail, getSystemConnection, GOOGLE_OAUTH } from "../lib/mailer.js";
import { testEmail } from "../lib/emailTemplates.js";
import { isSuperAdmin } from "../lib/access.js";

// Connect a user's Gmail (gmail.send only) via Google OAuth. See lib/mailer.js
// for how the connection is used.

const GOOGLE_AUTH_URL = process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth";
const SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const STATE_PURPOSE = "gmail-connect";

const configured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && process.env.EMAIL_TOKEN_KEY);

function requireConfigured() {
  if (!configured()) throw new ApiError("Email connection isn't configured on the server yet.", 503);
}

const allowedOrigins = () =>
  (process.env.CLIENT_URLS || "").split(",").map((s) => s.trim()).filter(Boolean);

function serializeConnection(c) {
  return c ? { email: c.email, status: c.status, lastError: c.lastError, isSystem: c.isSystem, connectedAt: c.connectedAt } : null;
}

export async function status(req, res, next) {
  try {
    const mine = await prisma.emailConnection.findUnique({ where: { userId: req.user.id } });
    const system = await getSystemConnection();
    return ok(res, {
      configured: configured(),
      connection: serializeConnection(mine),
      // Whether emails can still go out for an owner who hasn't connected.
      systemSenderAvailable: Boolean(system),
    });
  } catch (err) {
    next(err);
  }
}

export async function startGoogle(req, res, next) {
  try {
    requireConfigured();
    const origin = req.get("origin");
    if (!origin || !allowedOrigins().includes(origin)) {
      throw new ApiError("Start the connection from the admin panel.", 400);
    }

    // Signed, short-lived state ties the callback to this user and tells it
    // where to send the browser back to - it doesn't rely on the session cookie.
    const state = jwt.sign(
      { purpose: STATE_PURPOSE, sub: req.user.id, origin, nonce: crypto.randomBytes(8).toString("hex") },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );

    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: `openid email ${SEND_SCOPE}`,
      access_type: "offline", // gives us a refresh token
      prompt: "consent", // always re-issue it, even on reconnect
      login_hint: req.user.email,
      state,
    }).toString();

    return ok(res, { url: url.toString() });
  } catch (err) {
    next(err);
  }
}

// Browser is redirected here by Google (no session cookie guaranteed) - the
// signed `state` is what authorizes it.
export async function googleCallback(req, res) {
  let origin = allowedOrigins()[0] || "/";
  const back = (result) => res.redirect(`${origin}/settings?email=${result}`);

  try {
    const payload = jwt.verify(String(req.query.state || ""), process.env.JWT_SECRET);
    if (payload.purpose !== STATE_PURPOSE) throw new Error("bad state");
    if (allowedOrigins().includes(payload.origin)) origin = payload.origin;

    if (req.query.error || !req.query.code) return back("denied");
    requireConfigured();

    const tokenRes = await fetch(`${GOOGLE_OAUTH}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens.id_token) return back("error");

    // Google lets people untick individual permissions on the consent screen.
    if (!String(tokens.scope || "").includes("gmail.send")) return back("missing_permission");
    if (!tokens.refresh_token) return back("error");

    // id_token came straight from Google over TLS, so decoding is enough here.
    const idPayload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
    if (!idPayload.email) return back("error");

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return back("error");

    const data = {
      email: idPayload.email,
      refreshTokenEnc: encrypt(tokens.refresh_token),
      status: "active",
      lastError: null,
      isSystem: isSuperAdmin(user),
    };
    await prisma.emailConnection.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });

    return back("connected");
  } catch (err) {
    console.error("[EMAIL] Google callback failed:", err.message);
    return back("error");
  }
}

export async function sendTest(req, res, next) {
  try {
    const mine = await prisma.emailConnection.findUnique({ where: { userId: req.user.id } });
    if (!mine) throw new ApiError("Connect your Gmail first.", 400);
    if (mine.status !== "active") throw new ApiError("Your Gmail connection needs to be reconnected.", 400);

    const mail = testEmail(mine.email);
    // Send to the connected mailbox itself (not the admin login address, which
    // may not be a real inbox) so "did it arrive?" checks the same Gmail account.
    const result = await sendMail({ kind: "test", to: mine.email, ownerId: req.user.id, strict: true, ...mail });
    if (!result.ok) throw new ApiError(result.error || "Couldn't send the test email.", 502);
    return ok(res, { sentTo: mine.email, via: result.via }, "Test email sent");
  } catch (err) {
    next(err);
  }
}

export async function disconnect(req, res, next) {
  try {
    const mine = await prisma.emailConnection.findUnique({ where: { userId: req.user.id } });
    if (!mine) return ok(res, null, "Not connected");

    // Best effort: tell Google to revoke the grant; delete our copy regardless.
    try {
      await fetch(`${GOOGLE_OAUTH}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decrypt(mine.refreshTokenEnc) }),
      });
    } catch {
      /* already revoked or unreachable */
    }
    await prisma.emailConnection.delete({ where: { id: mine.id } });
    return ok(res, null, "Gmail disconnected");
  } catch (err) {
    next(err);
  }
}
