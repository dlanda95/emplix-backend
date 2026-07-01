-- 001_org_hierarchy_and_levels.sql
-- Idempotente: seguro re-ejecutar en schemas que ya tienen estos cambios.

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AreaType" AS ENUM ('TRANSVERSAL', 'EMISSIVE', 'RECEPTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoleType" AS ENUM ('OPERATIONAL', 'TACTICAL', 'STRATEGIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── departments: jerarquía (subáreas) + tipo de área + estado activo ──────────
ALTER TABLE "departments"
  ADD COLUMN IF NOT EXISTS "areaType"  "AreaType" NOT NULL DEFAULT 'TRANSVERSAL',
  ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN    NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "parentId"  TEXT;

DROP INDEX IF EXISTS "departments_name_key";

CREATE INDEX IF NOT EXISTS "departments_parentId_idx" ON "departments"("parentId");

DO $$ BEGIN
  ALTER TABLE "departments"
    ADD CONSTRAINT "departments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── positions: nivel jerárquico + tipo de rol + estado activo ─────────────────
ALTER TABLE "positions"
  ADD COLUMN IF NOT EXISTS "hierarchyLevel" INTEGER    NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "roleType"       "RoleType" NOT NULL DEFAULT 'OPERATIONAL',
  ADD COLUMN IF NOT EXISTS "isActive"       BOOLEAN    NOT NULL DEFAULT true;
