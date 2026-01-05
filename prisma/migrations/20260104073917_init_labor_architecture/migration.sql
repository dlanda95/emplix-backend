/*
  Warnings:

  - You are about to drop the column `contractType` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('BIOMETRIC', 'MOBILE_APP', 'WEB_PORTAL', 'SYSTEM_AUTO', 'MANUAL_HR');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT_ON_TIME', 'LATE', 'ABSENT_JUSTIFIED', 'ABSENT_UNJUSTIFIED', 'VACATION', 'MEDICAL_LEAVE', 'HOLIDAY', 'DAY_OFF');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_userId_fkey";

-- DropIndex
DROP INDEX "requests_tenantId_userId_idx";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "editReason" TEXT,
ADD COLUMN     "editedBy" TEXT,
ADD COLUMN     "hoursWorked" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'BIOMETRIC',
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "checkIn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "contractType",
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "employeeId" TEXT;

-- DropTable
DROP TABLE "Document";

-- DropEnum
DROP TYPE "ContractType";

-- CreateTable
CREATE TABLE "contract_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "hasBenefits" BOOLEAN NOT NULL DEFAULT true,
    "isLaboral" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_shifts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFiscalized" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakTime" INTEGER NOT NULL DEFAULT 60,
    "tolerance" INTEGER NOT NULL DEFAULT 5,
    "allowsOvertime" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_labor_data" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractTypeId" TEXT NOT NULL,
    "workShiftId" TEXT NOT NULL,
    "hierarchyLevel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "salary" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'PEN',

    CONSTRAINT "employee_labor_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "employeeId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_types_name_tenantId_key" ON "contract_types"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_labor_data_employeeId_key" ON "employee_labor_data"("employeeId");

-- CreateIndex
CREATE INDEX "documents_tenantId_employeeId_idx" ON "documents"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_labor_data" ADD CONSTRAINT "employee_labor_data_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_labor_data" ADD CONSTRAINT "employee_labor_data_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_labor_data" ADD CONSTRAINT "employee_labor_data_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
