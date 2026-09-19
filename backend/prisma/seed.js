import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@rentalpropertymanager.com";
const ADMIN_PASSWORD = "Admin123!";

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role, isVerified: true },
  });
}

async function main() {
  await upsertUser({ name: "Ops Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Admin" });

  console.log("\nSeed complete.");
  console.log(`Admin login:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
