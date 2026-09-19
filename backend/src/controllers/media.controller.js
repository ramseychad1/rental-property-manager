import { getObjectStream } from "../lib/storage.js";

export async function serveMedia(req, res) {
  try {
    const result = await getObjectStream(req.params.key);
    if (!result) return res.status(404).end();

    res.setHeader("Content-Type", result.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    result.Body.pipe(res);
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).end();
    }
    console.error(err);
    return res.status(500).end();
  }
}
