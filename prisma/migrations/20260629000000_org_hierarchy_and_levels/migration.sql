-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('TRANSVERSAL', 'EMISSIVE', 'RECEPTIVE');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('OPERATIONAL', 'TACTICAL', 'STRATEGIC');

-- AlterTable departments: jerarquía (subáreas) + tipo de área + estado activo
ALTER TABLE "departments"
  ADD COLUMN "areaType" "AreaType" NOT NULL DEFAULT 'TRANSVERSAL',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "parentId" TEXT;

-- Eliminar el único índice único global por nombre (unicidad manejada en app layer)
DROP INDEX IF EXISTS "departments_name_key";

-- Índice para búsquedas por parentId
CREATE INDEX "departments_parentId_idx" ON "departments"("parentId");

-- Clave foránea auto-referencial (subáreas → área padre)
ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable positions: nivel jerárquico + tipo de rol + estado activo
ALTER TABLE "positions"
  ADD COLUMN "hierarchyLevel" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "roleType" "RoleType" NOT NULL DEFAULT 'OPERATIONAL',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
