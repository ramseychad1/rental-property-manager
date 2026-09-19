// One-off tool for moving every object in a Railway Bucket to a different
// bucket (used when transferring this project to a new Railway workspace -
// buckets themselves can't be moved or transferred, only their contents).
//
// Usage:
//   node scripts/migrate-bucket.js backup   # old bucket -> ./bucket-backup/
//   node scripts/migrate-bucket.js restore  # ./bucket-backup/ -> new bucket
//
// "backup" reads OLD_* env vars, "restore" reads NEW_* env vars. Get the
// values from the Railway dashboard: click the bucket -> Credentials tab.
//
//   OLD_BUCKET, OLD_ACCESS_KEY_ID, OLD_SECRET_ACCESS_KEY, OLD_ENDPOINT, OLD_REGION
//   NEW_BUCKET, NEW_ACCESS_KEY_ID, NEW_SECRET_ACCESS_KEY, NEW_ENDPOINT, NEW_REGION
//
// Run backup, confirm the file count/sizes printed look right, THEN delete
// the old bucket in Railway. Only run restore once the new bucket exists.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const BACKUP_DIR = path.join(import.meta.dirname, "..", "bucket-backup");

function clientFor(prefix) {
  const bucket = process.env[`${prefix}_BUCKET`];
  const accessKeyId = process.env[`${prefix}_ACCESS_KEY_ID`];
  const secretAccessKey = process.env[`${prefix}_SECRET_ACCESS_KEY`];
  const endpoint = process.env[`${prefix}_ENDPOINT`];
  const region = process.env[`${prefix}_REGION`] || "auto";

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      `Missing ${prefix}_BUCKET / ${prefix}_ACCESS_KEY_ID / ${prefix}_SECRET_ACCESS_KEY / ${prefix}_ENDPOINT env vars.`,
    );
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return { client, bucket };
}

async function listAllKeys(client, bucket) {
  const keys = [];
  let ContinuationToken;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }),
    );
    for (const obj of res.Contents || []) keys.push(obj.Key);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function backup() {
  const { client, bucket } = clientFor("OLD");
  const keys = await listAllKeys(client, bucket);
  console.log(`Found ${keys.length} objects in "${bucket}". Downloading...`);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let totalBytes = 0;

  for (const [i, key] of keys.entries()) {
    const res = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = await streamToBuffer(res.Body);
    totalBytes += body.length;

    // Keys may contain "/" - keep them as a flat filename so restore can
    // map filename -> key exactly, without recreating nested directories.
    const safeName = key.replace(/\//g, "__");
    fs.writeFileSync(path.join(BACKUP_DIR, safeName), body);
    console.log(`[${i + 1}/${keys.length}] ${key} (${body.length} bytes)`);
  }

  fs.writeFileSync(
    path.join(BACKUP_DIR, "_manifest.json"),
    JSON.stringify({ bucket, keys, totalBytes }, null, 2),
  );

  console.log(
    `\nDone. ${keys.length} objects, ${(totalBytes / 1024 / 1024).toFixed(2)} MB, saved to ${BACKUP_DIR}`,
  );
  console.log("Verify this looks right before deleting the old bucket.");
}

async function restore() {
  const manifestPath = path.join(BACKUP_DIR, "_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No backup found at ${BACKUP_DIR}. Run "backup" first.`);
  }
  const { keys } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const { client, bucket } = clientFor("NEW");

  console.log(`Uploading ${keys.length} objects to "${bucket}"...`);

  for (const [i, key] of keys.entries()) {
    const safeName = key.replace(/\//g, "__");
    const body = fs.readFileSync(path.join(BACKUP_DIR, safeName));
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }),
    );
    console.log(`[${i + 1}/${keys.length}] ${key}`);
  }

  console.log(`\nDone. Restored ${keys.length} objects to "${bucket}".`);
  console.log(
    "Update the backend service's bucket env vars to point at this bucket, then redeploy.",
  );
}

const mode = process.argv[2];
if (mode === "backup") await backup();
else if (mode === "restore") await restore();
else {
  console.error("Usage: node scripts/migrate-bucket.js backup|restore");
  process.exit(1);
}
