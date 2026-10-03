-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "documentGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "documentKey" TEXT,
ADD COLUMN     "signedCopyAt" TIMESTAMP(3),
ADD COLUMN     "signedCopyReceived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "rentalAgreement" TEXT NOT NULL DEFAULT '';
