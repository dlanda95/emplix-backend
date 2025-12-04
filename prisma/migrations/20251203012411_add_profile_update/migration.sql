-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('VACATION', 'PERMIT', 'SICK_LEAVE', 'HOME_OFFICE', 'PROFILE_UPDATE');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "emergencyName" TEXT,
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "emergencyRel" TEXT;

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
