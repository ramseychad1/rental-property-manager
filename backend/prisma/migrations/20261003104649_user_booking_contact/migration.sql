-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "guestCity" TEXT,
ADD COLUMN     "guestState" TEXT,
ADD COLUMN     "guestStreet" TEXT,
ADD COLUMN     "guestZip" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZip" TEXT;
