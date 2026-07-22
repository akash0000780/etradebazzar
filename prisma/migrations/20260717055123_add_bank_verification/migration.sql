-- CreateEnum
CREATE TYPE "BankVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'NAME_MISMATCH', 'FAILED');

-- DropIndex
DROP INDEX "products_shopId_idx";

-- AlterTable
ALTER TABLE "seller_bank_details" ADD COLUMN     "fundAccountId" TEXT,
ADD COLUMN     "nameMatchScore" DOUBLE PRECISION,
ADD COLUMN     "verificationProvider" TEXT,
ADD COLUMN     "verificationStatus" "BankVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAccountHolderName" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");
