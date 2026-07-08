-- Migration: 002_password_reset_tokens
-- Tabla de tokens para recuperación de contraseña.
-- El token raw NUNCA se almacena — solo su hash SHA-256.
-- Expiran en 15 minutos y se eliminan al usarse (one-time use).

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);
