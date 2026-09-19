// Storage abstraction: writes to an S3-compatible bucket when BUCKET/
// ACCESS_KEY_ID/SECRET_ACCESS_KEY/ENDPOINT are set (matches the variable
// names Railway auto-injects for a Bucket), otherwise falls back to local
// disk under ./uploads so file uploads work with zero cloud setup in dev.
//
// Swapping to a real bucket later (e.g. a Railway Bucket) is just setting
// those env vars - no code change.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const s3Configured =
  !!process.env.BUCKET &&
  !!process.env.ACCESS_KEY_ID &&
  !!process.env.SECRET_ACCESS_KEY &&
  !!process.env.ENDPOINT;

let s3Client = null;
if (s3Configured) {
  s3Client = new S3Client({
    region: process.env.REGION || "auto",
    endpoint: process.env.ENDPOINT,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
  });
}

function keyFor(originalName) {
  const ext = path.extname(originalName || "").slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

// Local-disk URLs must be absolute: the frontend and admin panel are on
// entirely different origins than this API (both locally and, especially,
// once deployed - e.g. separate Railway services), so a relative "/uploads/x"
// resolves against the WRONG origin (whichever app is rendering the <img>),
// not this backend. RAILWAY_PUBLIC_DOMAIN is auto-injected once this service
// has a generated domain; PORT falls back for local dev.
function publicBaseUrl() {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 8001}`;
}

export const storageMode = s3Configured ? "s3" : "local";

export async function saveFile(file) {
  const key = keyFor(file.originalname);

  if (s3Configured) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Railway Buckets (like most S3-compatible buckets in practice) are
    // private - there is no public-read option, so a direct bucket URL
    // 403s for browsers. Serve through our own proxy route instead, using
    // the bucket's credentials server-side. See getObjectStream() below and
    // routes/media.routes.js.
    return { key, url: `${publicBaseUrl()}/api/media/${key}` };
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, key), file.buffer);
  return { key, url: `${publicBaseUrl()}/uploads/${key}` };
}

export async function getObjectStream(key) {
  if (!s3Configured) return null;
  return s3Client.send(new GetObjectCommand({ Bucket: process.env.BUCKET, Key: key }));
}

export async function deleteFile(urlOrKey) {
  if (!urlOrKey) return;

  if (urlOrKey.includes("/api/media/")) {
    const key = urlOrKey.split("/api/media/").pop();
    if (s3Configured) {
      await s3Client
        .send(new DeleteObjectCommand({ Bucket: process.env.BUCKET, Key: key }))
        .catch(() => {});
    }
    return;
  }

  if (urlOrKey.includes("/uploads/")) {
    const key = urlOrKey.split("/uploads/").pop();
    fs.rm(path.join(UPLOADS_DIR, key), { force: true }, () => {});
  }
}

export { UPLOADS_DIR };
