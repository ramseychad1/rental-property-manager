import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { ApiError } from "./response.js";
import { notifyOtp } from "./notifications.js";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function issueCode(email, purpose) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationCode.create({
    data: { email: email.toLowerCase(), code, purpose, expiresAt },
  });

  // Sent through the system Gmail sender. With no sender connected the mailer
  // logs the message (including the code) to the console instead, so dev works.
  const result = await notifyOtp(email, purpose, code);
  if (result?.status === "failed") {
    throw new ApiError("We couldn't send the email right now. Please try again shortly.", 502);
  }

  return code;
}

export async function verifyCode(email, purpose, code) {
  const record = await prisma.verificationCode.findFirst({
    where: {
      email: email.toLowerCase(),
      purpose,
      code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
