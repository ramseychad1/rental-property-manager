import { ZodError } from "zod";
import { fail } from "../lib/response.js";

export function notFoundHandler(req, res) {
  return fail(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return fail(res, "Validation failed", 422, err.flatten());
  }

  if (err?.name === "MulterError") {
    return fail(res, err.message, 400);
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }

  return fail(res, err.message || "Internal server error", status, err.details);
}
