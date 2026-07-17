-- 004_selection_process_dept_approvers.sql
-- Agrega área (obligatoria), puesto (opcional) y aprobadores a procesos de selección.
-- Idempotente: seguro re-ejecutar.

-- ── Columnas en selection_processes ──────────────────────────────────────────
ALTER TABLE "selection_processes"
  ADD COLUMN IF NOT EXISTS "departmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "positionId"   TEXT;

CREATE INDEX IF NOT EXISTS "selection_processes_departmentId_idx"
  ON "selection_processes"("departmentId");

DO $$ BEGIN
  ALTER TABLE "selection_processes"
    ADD CONSTRAINT "selection_processes_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "selection_processes"
    ADD CONSTRAINT "selection_processes_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "positions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabla de aprobadores ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "selection_process_approvers" (
  "id"                 TEXT         NOT NULL,
  "selectionProcessId" TEXT         NOT NULL,
  "employeeId"         TEXT         NOT NULL,
  "order"              INTEGER      NOT NULL DEFAULT 1,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "selection_process_approvers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "spa_sp_emp_key"
  ON "selection_process_approvers"("selectionProcessId", "employeeId");

CREATE INDEX IF NOT EXISTS "spa_selectionProcessId_idx"
  ON "selection_process_approvers"("selectionProcessId");

DO $$ BEGIN
  ALTER TABLE "selection_process_approvers"
    ADD CONSTRAINT "spa_selectionProcessId_fkey"
    FOREIGN KEY ("selectionProcessId") REFERENCES "selection_processes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "selection_process_approvers"
    ADD CONSTRAINT "spa_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
