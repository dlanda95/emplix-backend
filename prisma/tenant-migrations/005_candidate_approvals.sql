-- 005_candidate_approvals.sql
-- Tabla de aprobaciones por candidato dentro de un proceso de selección.
-- Idempotente: seguro re-ejecutar.

CREATE TABLE IF NOT EXISTS "candidate_approvals" (
  "id"                  TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "selectionProcessId"  TEXT        NOT NULL,
  "candidateId"         TEXT        NOT NULL,
  "approverId"          TEXT        NOT NULL,
  "approverType"        TEXT        NOT NULL DEFAULT 'APPROVER',
  "status"              TEXT        NOT NULL DEFAULT 'PENDING',
  "comment"             TEXT,
  "decidedAt"           TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "candidate_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_approvals_unique" UNIQUE ("selectionProcessId", "candidateId", "approverId")
);

DO $$ BEGIN
  ALTER TABLE "candidate_approvals"
    ADD CONSTRAINT "candidate_approvals_process_fk"
    FOREIGN KEY ("selectionProcessId")
    REFERENCES "selection_processes"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "candidate_approvals"
    ADD CONSTRAINT "candidate_approvals_candidate_fk"
    FOREIGN KEY ("candidateId")
    REFERENCES "employees"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "candidate_approvals_process_candidate_idx"
  ON "candidate_approvals"("selectionProcessId", "candidateId");

CREATE INDEX IF NOT EXISTS "candidate_approvals_approver_idx"
  ON "candidate_approvals"("approverId");
