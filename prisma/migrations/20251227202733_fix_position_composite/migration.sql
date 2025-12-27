/*
  Warnings:

  - You are about to drop the `Kudo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Kudo" DROP CONSTRAINT "Kudo_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Kudo" DROP CONSTRAINT "Kudo_senderId_fkey";

-- DropIndex
DROP INDEX "employees_documentId_key";

-- DropTable
DROP TABLE "Kudo";

-- CreateTable
CREATE TABLE "kudos" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "kudos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kudos_tenantId_createdAt_idx" ON "kudos"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "attendances_tenantId_date_idx" ON "attendances"("tenantId", "date");

-- CreateIndex
CREATE INDEX "departments_tenantId_idx" ON "departments"("tenantId");

-- CreateIndex
CREATE INDEX "employees_tenantId_status_idx" ON "employees"("tenantId", "status");

-- CreateIndex
CREATE INDEX "employees_tenantId_supervisorId_idx" ON "employees"("tenantId", "supervisorId");

-- CreateIndex
CREATE INDEX "positions_tenantId_idx" ON "positions"("tenantId");

-- CreateIndex
CREATE INDEX "requests_tenantId_status_idx" ON "requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "requests_tenantId_userId_idx" ON "requests"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
