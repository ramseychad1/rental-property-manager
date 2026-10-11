/*
  Warnings:

  - Made the column `siteId` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `siteId` on table `ThingToDo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SiteAdmin';

-- Safety net: stamp anything created without a complex before the columns become required.
UPDATE "Property" SET "siteId" = (SELECT "id" FROM "Site" WHERE "slug" = 'default') WHERE "siteId" IS NULL;
UPDATE "ThingToDo" SET "siteId" = (SELECT "id" FROM "Site" WHERE "slug" = 'default') WHERE "siteId" IS NULL;

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ThingToDo" ALTER COLUMN "siteId" SET NOT NULL;
