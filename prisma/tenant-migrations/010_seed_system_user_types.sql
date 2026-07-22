-- 010_seed_system_user_types.sql
-- Inserts default system user types matching SYSTEM_TYPE_DEFAULTS in system-config.dto.ts.
-- Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO "system_user_types" ("id", "name", "slug", "description", "permissions", "color", "isSystem", "isActive", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'Administrador',
    'admin',
    'Acceso completo a todos los módulos y configuración del sistema',
    '{"canRead":true,"canCreate":true,"canEdit":true,"canDelete":true,"canApprove":true,"canManageConfig":true,"canManageUsers":true}',
    '#6366f1',
    true,
    true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid()::text,
    'Lector',
    'reader',
    'Acceso de solo lectura sin posibilidad de modificar datos',
    '{"canRead":true,"canCreate":false,"canEdit":false,"canDelete":false,"canApprove":false,"canManageConfig":false,"canManageUsers":false}',
    '#6b7280',
    true,
    true,
    NOW(), NOW()
  ),
  (
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
