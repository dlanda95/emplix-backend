-- 009_users_name_types_and_domains.sql
-- Adds missing schema elements that were added to tenant.prisma without migrations:
--   1. system_user_types table (for custom user roles/types)
--   2. firstName / lastName / systemUserTypeId columns on users
--   3. tenant_domains table (corporate email domains)

-- ── 1. system_user_types ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "system_user_types" (
  "id"          TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "slug"        TEXT        NOT NULL,
  "description" TEXT,
  "permissions" JSONB       NOT NULL DEFAULT '{}',
  "color"       TEXT        NOT NULL DEFAULT '#6B7280',
  "isSystem"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "isActive"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "system_user_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_user_types_slug_key"
  ON "system_user_types"("slug");

-- ── 2. users: nuevas columnas ─────────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "firstName"        TEXT,
  ADD COLUMN IF NOT EXISTS "lastName"         TEXT,
  ADD COLUMN IF NOT EXISTS "systemUserTypeId" TEXT;

-- FK usuarios → system_user_types (solo si la columna acaba de agregarse y la
-- constraint aún no existe)
DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_systemUserTypeId_fkey"
    FOREIGN KEY ("systemUserTypeId")
    REFERENCES "system_user_types"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. tenant_domains ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tenant_domains" (
  "id"        TEXT        NOT NULL,
  "domain"    TEXT        NOT NULL,
  "label"     TEXT,
  "isPrimary" BOOLEAN     NOT NULL DEFAULT FALSE,
  "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_domains_domain_key"
  ON "tenant_domains"("domain");
