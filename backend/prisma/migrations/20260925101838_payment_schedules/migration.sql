-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "depositAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentTerms" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "BookingInstallment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "includesDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingInstallment_bookingId_idx" ON "BookingInstallment"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingInstallment" ADD CONSTRAINT "BookingInstallment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
