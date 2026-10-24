import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@rentalpropertymanager.com";
// No default password in the repo: set SEED_ADMIN_PASSWORD, or one is generated and printed once.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString("base64url");

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role, isVerified: true },
  });
}

async function main() {
  const existed = !!(await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }));
  await upsertUser({ name: "Platform Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "SuperAdmin" });

  console.log("\nSeed complete.");
  if (existed) {
    console.log(`Admin ${ADMIN_EMAIL} already exists and was left unchanged.\n`);
  } else {
    console.log(`Admin login:  ${ADMIN_EMAIL} / ${process.env.SEED_ADMIN_PASSWORD ? "(the SEED_ADMIN_PASSWORD you set)" : ADMIN_PASSWORD}\n`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
