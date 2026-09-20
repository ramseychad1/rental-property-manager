import { z } from "zod";
import { ok } from "../lib/response.js";
import { notifyContact } from "../lib/notifications.js";

const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  message: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

// Delivered by email through the system Gmail sender (see lib/notifications.js);
// with none connected it's only logged.
export async function sendContact(req, res, next) {
  try {
    const body = contactSchema.parse(req.body);
    void notifyContact(body);
    return ok(res, null, "Thanks for reaching out - we'll be in touch soon.");
  } catch (err) {
    next(err);
  }
}
