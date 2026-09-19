import { z } from "zod";
import { ok } from "../lib/response.js";

const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  message: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

// No email provider is wired up for this POC - the message is logged
// server-side so the contact form has somewhere real to land.
export async function sendContact(req, res, next) {
  try {
    const body = contactSchema.parse(req.body);
    console.log("\n[CONTACT] New message:", body, "\n");
    return ok(res, null, "Thanks for reaching out - we'll be in touch soon.");
  } catch (err) {
    next(err);
  }
}
