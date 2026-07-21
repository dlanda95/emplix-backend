-- 007_must_change_password.sql
-- Adds mustChangePassword flag to users table.
-- Set to true when HR activates a new collaborator so they must set their own
-- password on first login.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT FALSE;
