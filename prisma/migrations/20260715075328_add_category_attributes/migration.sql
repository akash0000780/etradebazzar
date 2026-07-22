-- CreateEnum
CREATE TYPE "CategoryAttributeType" AS ENUM ('TEXT', 'NUMBER', 'ENUM', 'BOOLEAN');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB;

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CategoryAttributeType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_attributes_categoryId_idx" ON "category_attributes"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_categoryId_key_key" ON "category_attributes"("categoryId", "key");

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
