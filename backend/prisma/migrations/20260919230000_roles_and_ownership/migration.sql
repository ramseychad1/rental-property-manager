-- Roles: "Admin" becomes "SuperAdmin" (existing admin rows keep working under
-- the new name) and a new "Owner" role is added for per-property managers.
ALTER TYPE "UserRole" RENAME VALUE 'Admin' TO 'SuperAdmin';
ALTER TYPE "UserRole" ADD VALUE 'Owner';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
