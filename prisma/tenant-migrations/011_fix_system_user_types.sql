-- 011_fix_system_user_types.sql
-- Corrige los tipos de usuario del sistema para que coincidan con los defaults
-- de SYSTEM_TYPE_DEFAULTS: solo admin, reader (Lector) y support (Soporte).
-- Elimina jefe-area y rrhh (sin usuarios asignados), renombra reader a Lector
-- e inserta soporte si no existe.

-- Eliminar tipos incorrectos (sin usuarios asignados)
DELETE FROM "system_user_types" WHERE "slug" IN ('jefe-area', 'rrhh');

-- Renombrar "Solo Lectura" → "Lector" y actualizar descripción
UPDATE "system_user_types"
SET
  "name"        = 'Lector',
  "description" = 'Acceso de solo lectura sin posibilidad de modificar datos',
  "updatedAt"   = NOW()
WHERE "slug" = 'reader';

-- Insertar Soporte si no existe
INSERT INTO "system_user_types" ("id", "name", "slug", "description", "permissions", "color", "isSystem", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'Soporte',
  'support',
  'Lectura, edición y aprobaciones, sin gestión de usuarios ni eliminación',
  '{"canRead":true,"canCreate":false,"canEdit":true,"canDelete":false,"canApprove":true,"canManageConfig":true,"canManageUsers":false}',
  '#0ea5e9',
  true,
  true,
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;
