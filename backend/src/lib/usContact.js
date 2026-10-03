// US-only contact validation shared by booking requests and profile updates.
// Phones are stored as E.164 (+1XXXXXXXXXX), the format the frontend's phone
// input emits. Any valid US number is accepted - mobile vs landline isn't checked.

import { z } from "zod";

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// Accepts "(555) 234-5678", "555-234-5678", "+1 555 234 5678", ... and
// normalizes to +1XXXXXXXXXX. Area code and exchange can't start with 0 or 1.
export function normalizeUsPhone(input) {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? `+1${digits}` : null;
}

export const usPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeUsPhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid US phone number" });
    return n ?? v;
  });

export const usState = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => US_STATES.includes(v), "Select a US state");

export const usZip = z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code");

export const street = z.string().trim().min(1, "Street address is required").max(200);
export const city = z.string().trim().min(1, "City is required").max(100);

// Prefix for error-free "present or empty" fields on the profile form.
export const orEmpty = (schema) => z.union([z.literal(""), schema]);
