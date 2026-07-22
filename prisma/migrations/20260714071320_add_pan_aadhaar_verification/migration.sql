-- AlterTable
ALTER TABLE "seller_kyc" ADD COLUMN     "aadhaarOtpClientId" TEXT,
ADD COLUMN     "aadhaarVerificationMeta" JSONB,
ADD COLUMN     "aadhaarVerifiedName" TEXT,
ADD COLUMN     "govtIdVerificationMeta" JSONB,
ADD COLUMN     "govtIdVerifiedName" TEXT;
