/**
 * Provisioning script — crea un nuevo tenant:
 *   1. Crea el schema de PostgreSQL: tenant_{slug}
 *   2. Ejecuta el DDL de las tablas de RRHH en ese schema (prisma db push)
 *   3. Crea _tenant_migrations y marca todas las migraciones existentes como aplicadas
 *   4. Inserta el registro en la tabla platform.tenants
 *   5. Crea las TenantAuthConfig iniciales
 *
 * Uso:
 *   ts-node src/scripts/provision-tenant.ts \
 *     --slug=acme-corp \
 *     --name="Acme Corp S.A." \
 *     --email=true \
 *     --microsoft=true \
 *     --azure-tenant-id=XXXXX-XXXXX
 */

import 'dotenv/config';
import * as fs from 'fs';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import * as path from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

async function main() {
  const slug = args['slug'];
  const name = args['name'] ?? slug;
  const enableEmail = args['email'] !== 'false';
  const enableMicrosoft = args['microsoft'] === 'true';
  const azureTenantId = args['azure-tenant-id'];

  if (!slug) {
    console.error('Uso: ts-node provision-tenant.ts --slug=mi-empresa --name="Mi Empresa"');
    process.exit(1);
  }

  const schemaName = `tenant_${slug.replace(/-/g, '_')}`;
  console.log(`Provisionando tenant: ${slug} → schema: ${schemaName}`);

  // Eliminar ?schema=... correctamente: si era el primer parámetro queda un &
  // huérfano que hay que convertir en ? para que la URL sea válida.
  const baseUrl = process.env.DATABASE_URL!
    .replace(/[?&]schema=[^&]*/, '')
    .replace(/^([^?]*)&/, '$1?');

  // ── 0. Diagnóstico: ver qué tablas existen en producción ──────────────────
  const diagPool = new Pool({ connectionString: baseUrl });
  try {
    const diag = await diagPool.query(
      `SELECT table_schema, table_name FROM information_schema.tables
       WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
       ORDER BY table_schema, table_name`
    );
    console.log(`  [DEBUG] Tablas en BD (${diag.rows.length} total):`);
    diag.rows.forEach(r => console.log(`    - ${r.table_schema}.${r.table_name}`));
  } finally {
    await diagPool.end();
  }

  // ── 1. Crear schema de PostgreSQL ─────────────────────────────────────────
  const pool = new Pool({ connectionString: baseUrl });

  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`  ✓ Schema "${schemaName}" creado`);
  } finally {
    await pool.end();
  }

  // ── 2. Ejecutar DDL del tenant (prisma db push) ───────────────────────────
  const platformUrl = baseUrl.includes('?') ? `${baseUrl}&schema=public` : `${baseUrl}?schema=public`;
  const tenantUrl   = baseUrl.includes('?') ? `${baseUrl}&schema=${schemaName}` : `${baseUrl}?schema=${schemaName}`;
  const schemaFile = path.resolve(__dirname, '../../prisma/tenant.prisma');

  // Push plataforma (tablas tenants + tenant_auth_configs en public) con URL explícita
  const platformSchemaFile = path.resolve(__dirname, '../../prisma/schema.prisma');
  execSync(
    `npx prisma db push --schema="${platformSchemaFile}" --accept-data-loss --skip-generate`,
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: platformUrl } },
  );
  console.log(`  ✓ Schema de plataforma sincronizado`);

  // Push tenant (tablas RRHH en schema del tenant) con URL explícita
  execSync(
    `npx prisma db push --schema="${schemaFile}" --accept-data-loss --skip-generate`,
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: tenantUrl } },
  );
  console.log(`  ✓ Tablas creadas en "${schemaName}"`);

  // ── 3. Marcar migraciones existentes como ya aplicadas ────────────────────
  // prisma db push aplica el schema completo, por lo que las migraciones en
  // prisma/migrations/tenant/ ya están reflejadas — solo registramos el tracking.
  const migrationDir = path.resolve(__dirname, '../../prisma/tenant-migrations');
  if (fs.existsSync(migrationDir)) {
    const migrationFiles = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
    if (migrationFiles.length > 0) {
      const seedPool = new Pool({ connectionString: baseUrl });
      await seedPool.query(`
        CREATE TABLE IF NOT EXISTS "${schemaName}"."_tenant_migrations" (
          id          SERIAL       PRIMARY KEY,
          filename    TEXT         NOT NULL UNIQUE,
          applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      for (const file of migrationFiles) {
        await seedPool.query(
          `INSERT INTO "${schemaName}"."_tenant_migrations" (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
          [file],
        );
      }
      await seedPool.end();
      console.log(`  ✓ Tracking de migraciones inicializado (${migrationFiles.length} marcadas como aplicadas)`);
    }
  }

  // ── 4. Registrar en platform.tenants (raw SQL para garantizar la URL correcta) ───
  const platformPool = new Pool({ connectionString: baseUrl });
  try {
    // Verificar si la tabla tenants existe
    const tableCheck = await platformPool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants'`
    );
    console.log(`  [DEBUG] Tabla 'tenants' encontrada: ${tableCheck.rows.length > 0}`);

    const existingRows = await platformPool.query(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
    if (existingRows.rows.length > 0) {
      console.warn(`  ⚠ El tenant "${slug}" ya existe en la plataforma — omitiendo inserción.`);
    } else {
      const tenantId = crypto.randomUUID();
      const now = new Date().toISOString();
      await platformPool.query(
        `INSERT INTO tenants (id, slug, name, "schemaName", plan, status, settings, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'STARTER', 'ACTIVE', '{}', $5, $5)`,
        [tenantId, slug, name, schemaName, now],
      );
      console.log(`  ✓ Tenant registrado: ${tenantId}`);

      // ── 5. Auth configs iniciales ───────────────────────────────────────
      if (enableEmail) {
        const authId1 = crypto.randomUUID();
        await platformPool.query(
          `INSERT INTO tenant_auth_configs (id, "tenantId", method, enabled, "createdAt", "updatedAt")
           VALUES ($1, $2, 'EMAIL', true, $3, $3)`,
          [authId1, tenantId, now],
        );
        console.log('  ✓ Auth EMAIL habilitado');
      }

      if (enableMicrosoft) {
        if (!azureTenantId) {
          console.warn('  ⚠ --azure-tenant-id requerido para habilitar MICROSOFT. Omitiendo.');
        } else {
          const authId2 = crypto.randomUUID();
          await platformPool.query(
            `INSERT INTO tenant_auth_configs (id, "tenantId", method, enabled, "azureTenantId", "createdAt", "updatedAt")
             VALUES ($1, $2, 'MICROSOFT', true, $3, $4, $4)`,
            [authId2, tenantId, azureTenantId, now],
          );
          console.log(`  ✓ Auth MICROSOFT habilitado (Azure Tenant: ${azureTenantId})`);
        }
      }
    }
  } finally {
    await platformPool.end();
  }

  console.log(`\nTenant "${slug}" provisionado correctamente.`);
}

main().catch(err => {
  console.error('Error en provisioning:', err);
  process.exit(1);
});
