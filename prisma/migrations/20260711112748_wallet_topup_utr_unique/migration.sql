/*
  Warnings:

  - A unique constraint covering the columns `[utrReference]` on the table `wallet_topups` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "wallet_topups_utrReference_key" ON "wallet_topups"("utrReference");
