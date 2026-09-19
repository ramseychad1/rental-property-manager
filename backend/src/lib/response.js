export function ok(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function fail(res, message = "Something went wrong", status = 400, details) {
  return res.status(status).json({ success: false, message, error: message, details });
}

export class ApiError extends Error {
  constructor(message, status = 400, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
