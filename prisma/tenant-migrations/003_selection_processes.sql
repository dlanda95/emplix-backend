-- 003_selection_processes.sql
-- Idempotente: seguro re-ejecutar en schemas que ya tienen estos cambios.

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "SelectionProcessStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabla principal ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "selection_processes" (
  "id"          TEXT                     NOT NULL,
  "code"        TEXT                     NOT NULL,
  "name"        TEXT                     NOT NULL,
  "description" TEXT,
  "status"      "SelectionProcessStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt"    TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"    TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "selection_processes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "selection_processes_code_key"    ON "selection_processes"("code");
CREATE        INDEX IF NOT EXISTS "selection_processes_status_idx"  ON "selection_processes"("status");
CREATE        INDEX IF NOT EXISTS "selection_processes_code_idx"    ON "selection_processes"("code");

-- ── FK en employees ───────────────────────────────────────────────────────────
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "selectionProcessId" TEXT;

CREATE INDEX IF NOT EXISTS "employees_selectionProcessId_idx"
  ON "employees"("selectionProcessId");

DO $$ BEGIN
  ALTER TABLE "employees"
    ADD CONSTRAINT "employees_selectionProcessId_fkey"
    FOREIGN KEY ("selectionProcessId") REFERENCES "selection_processes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
