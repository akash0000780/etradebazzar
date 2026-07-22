-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'UNFULFILLABLE';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dispatchDeadline" TIMESTAMP(3),
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "packingDeadline" TIMESTAMP(3),
ADD COLUMN     "slaBreachedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "slaBreachCount" INTEGER NOT NULL DEFAULT 0;
