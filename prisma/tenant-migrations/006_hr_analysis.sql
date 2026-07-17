-- 006_hr_analysis.sql
-- Tablas para el análisis de RR.HH. por candidato dentro de un proceso de selección.
-- Idempotente: seguro re-ejecutar.

-- Enum de recomendación (PostgreSQL type)
DO $$ BEGIN
  CREATE TYPE "HRRecommendation" AS ENUM (
    'PENDING', 'APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Análisis por candidato (uno por proceso+candidato)
CREATE TABLE IF NOT EXISTS "hr_candidate_analyses" (
  "id"                   TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "selectionProcessId"   TEXT          NOT NULL,
  "candidateId"          TEXT          NOT NULL,
  "professionalSummary"  TEXT,
  "strengths"            TEXT,
  "improvementAreas"     TEXT,
  "interviewResults"     TEXT,
  "competencyEvaluation" TEXT,
  "identifiedRisks"      TEXT,
  "recommendation"       "HRRecommendation" NOT NULL DEFAULT 'PENDING',
  "recommendationNotes"  TEXT,
  "createdById"          TEXT,
  "createdAt"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "hr_candidate_analyses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_candidate_analyses_unique" UNIQUE ("selectionProcessId", "candidateId")
);

DO $$ BEGIN
  ALTER TABLE "hr_candidate_analyses"
    ADD CONSTRAINT "hr_candidate_analyses_process_fk"
    FOREIGN KEY ("selectionProcessId")
    REFERENCES "selection_processes"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "hr_candidate_analyses"
    ADD CONSTRAINT "hr_candidate_analyses_candidate_fk"
    FOREIGN KEY ("candidateId")
    REFERENCES "employees"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "hr_candidate_analyses_process_idx"
  ON "hr_candidate_analyses"("selectionProcessId");

CREATE INDEX IF NOT EXISTS "hr_candidate_analyses_candidate_idx"
  ON "hr_candidate_analyses"("candidateId");

-- Documentos adjuntos al análisis
CREATE TABLE IF NOT EXISTS "hr_analysis_documents" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "analysisId"   TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "originalName" TEXT        NOT NULL,
  "mimeType"     TEXT        NOT NULL,
  "size"         INTEGER     NOT NULL,
  "path"         TEXT        NOT NULL,
  "uploadedById" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "hr_analysis_documents_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "hr_analysis_documents"
    ADD CONSTRAINT "hr_analysis_documents_analysis_fk"
    FOREIGN KEY ("analysisId")
    REFERENCES "hr_candidate_analyses"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "hr_analysis_documents_analysis_idx"
  ON "hr_analysis_documents"("analysisId");
