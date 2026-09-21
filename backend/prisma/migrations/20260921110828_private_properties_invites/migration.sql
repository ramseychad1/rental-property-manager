-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OwnerInvite" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerGrant" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "guestUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OwnerGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerInvite_tokenHash_key" ON "OwnerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnerInvite_ownerId_idx" ON "OwnerInvite"("ownerId");

-- CreateIndex
CREATE INDEX "OwnerGrant_guestUserId_idx" ON "OwnerGrant"("guestUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerGrant_ownerId_guestUserId_key" ON "OwnerGrant"("ownerId", "guestUserId");

-- AddForeignKey
ALTER TABLE "OwnerInvite" ADD CONSTRAINT "OwnerInvite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerInvite" ADD CONSTRAINT "OwnerInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerGrant" ADD CONSTRAINT "OwnerGrant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerGrant" ADD CONSTRAINT "OwnerGrant_guestUserId_fkey" FOREIGN KEY ("guestUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
