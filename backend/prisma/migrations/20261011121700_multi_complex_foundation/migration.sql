-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('Guest', 'Owner', 'SiteAdmin');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ThingToDo" ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "VerificationCode" ADD COLUMN     "siteId" TEXT;

-- CreateTable
CREATE TABLE "SiteDomain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteDomain_hostname_key" ON "SiteDomain"("hostname");

-- CreateIndex
CREATE INDEX "SiteDomain_siteId_idx" ON "SiteDomain"("siteId");

-- CreateIndex
CREATE INDEX "SiteMembership_siteId_idx" ON "SiteMembership"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMembership_userId_siteId_key" ON "SiteMembership"("userId", "siteId");

-- CreateIndex
CREATE INDEX "Property_siteId_idx" ON "Property"("siteId");

-- CreateIndex
CREATE INDEX "ThingToDo_siteId_idx" ON "ThingToDo"("siteId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDomain" ADD CONSTRAINT "SiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThingToDo" ADD CONSTRAINT "ThingToDo_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: everything that exists today belongs to the single "default" complex.
INSERT INTO "Site" ("id", "slug", "name", "isActive", "updatedAt")
SELECT gen_random_uuid()::text, 'default', 'My Property Site', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Site" WHERE "slug" = 'default');

-- The current production public site hostname (other environments resolve via
-- the dev fallback added with site resolution).
INSERT INTO "SiteDomain" ("id", "hostname", "siteId", "isPrimary")
SELECT gen_random_uuid()::text, 'frontend-production-c0d1.up.railway.app', "id", true
FROM "Site" WHERE "slug" = 'default'
ON CONFLICT ("hostname") DO NOTHING;

-- One membership per non-SuperAdmin user, copying their current role.
INSERT INTO "SiteMembership" ("id", "userId", "siteId", "role")
SELECT gen_random_uuid()::text, u."id", s."id", u."role"::text::"MembershipRole"
FROM "User" u CROSS JOIN "Site" s
WHERE s."slug" = 'default' AND u."role" <> 'SuperAdmin'
ON CONFLICT ("userId", "siteId") DO NOTHING;

UPDATE "Property" SET "siteId" = (SELECT "id" FROM "Site" WHERE "slug" = 'default') WHERE "siteId" IS NULL;
UPDATE "ThingToDo" SET "siteId" = (SELECT "id" FROM "Site" WHERE "slug" = 'default') WHERE "siteId" IS NULL;
