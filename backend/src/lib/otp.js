import crypto from "node:crypto";
import { prisma } from "./prisma.js";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function issueCode(email, purpose) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationCode.create({
    data: { email: email.toLowerCase(), code, purpose, expiresAt },
  });

  // No email provider wired up for this POC - the code goes to the backend's
  // own console so signup/reset can be tested without configuring one.
  console.log(
    `\n[OTP] ${purpose} code for ${email}: ${code} (expires in 10 min)\n`,
  );

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
