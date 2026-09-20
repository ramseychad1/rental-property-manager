import crypto from "node:crypto";
import { ApiError } from "./response.js";

// AES-256-GCM for secrets stored in the database (Gmail refresh tokens).
// EMAIL_TOKEN_KEY must be 32 random bytes, base64: openssl rand -base64 32

function key() {
  const raw = process.env.EMAIL_TOKEN_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) {
    throw new ApiError("Email connection isn't configured on the server (EMAIL_TOKEN_KEY).", 503);
  }
  return buf;
}

// Format: base64(iv).base64(tag).base64(ciphertext)
export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload) {
  const [iv, tag, data] = String(payload).split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
