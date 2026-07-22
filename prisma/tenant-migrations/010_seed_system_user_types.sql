-- 010_seed_system_user_types.sql
-- Inserts default system user types. Safe to re-run (ON CONFLICT DO NOTHING).

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
    'Recursos Humanos',
    'rrhh',
    'Gestión de personal, selección, análisis HR y aprobaciones',
    '{"canRead":true,"canCreate":true,"canEdit":true,"canDelete":false,"canApprove":true,"canManageConfig":false,"canManageUsers":false}',
    '#ec4899',
    true,
    true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid()::text,
    'Jefe de Área',
    'jefe-area',
    'Aprobación de solicitudes y visualización del equipo a cargo',
    '{"canRead":true,"canCreate":false,"canEdit":false,"canDelete":false,"canApprove":true,"canManageConfig":false,"canManageUsers":false}',
    '#f59e0b',
    true,
    true,
    NOW(), NOW()
  ),
  (
    gen_random_uuid()::text,
    'Solo Lectura',
    'reader',
    'Acceso de solo lectura sin posibilidad de modificar datos',
    '{"canRead":true,"canCreate":false,"canEdit":false,"canDelete":false,"canApprove":false,"canManageConfig":false,"canManageUsers":false}',
    '#6b7280',
    true,
    true,
    NOW(), NOW()
  )
ON CONFLICT (slug) DO NOTHING;
