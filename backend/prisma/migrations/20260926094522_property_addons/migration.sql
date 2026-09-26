-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "selectedAddOns" JSONB NOT NULL DEFAULT '[]';
