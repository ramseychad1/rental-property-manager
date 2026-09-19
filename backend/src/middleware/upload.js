import multer from "multer";

// Files are kept in memory and streamed out to storage.js (S3 or local disk)
// rather than written to Multer's own disk storage.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

// Reconstructs one level of bracket-notation nested fields
// (`location[url]` -> `{ location: { url } }`) that multipart/form-data
// bodies arrive as, since multer/Express don't do this automatically the
// way `qs`-based urlencoded parsing does.
export function unflatten(body = {}) {
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^([^[]+)\[([^\]]+)\]$/);
    if (match) {
      const [, parent, child] = match;
      result[parent] = result[parent] || {};
      result[parent][child] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}
