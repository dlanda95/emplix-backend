-- 008_salary_expectation.sql
-- Agrega pretensión salarial al análisis de RR.HH.
-- Idempotente: seguro re-ejecutar.

ALTER TABLE "hr_candidate_analyses"
  ADD COLUMN IF NOT EXISTS "salaryExpectation" NUMERIC(12,2);
