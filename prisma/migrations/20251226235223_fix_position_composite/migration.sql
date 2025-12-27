/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `positions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "positions_name_tenantId_key" ON "positions"("name", "tenantId");
