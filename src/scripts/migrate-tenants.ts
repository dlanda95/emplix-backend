/**
 * migrate-tenants.ts — aplica migraciones SQL incrementales a todos los schemas de tenant.
 *
 * Uso:
 *   ts-node src/scripts/migrate-tenants.ts
 *   ts-node src/scripts/migrate-tenants.ts --tenant=acme-corp   # solo un tenant
 *   ts-node src/scripts/migrate-tenants.ts --dry-run            # muestra qué se aplicaría
 *
 * Los archivos SQL viven en prisma/migrations/tenant/*.sql (orden alfabético = cronológico).
 * Cada tenant tiene una tabla _tenant_migrations en su schema para evitar re-aplicar.
 * Cada migración se ejecuta en una transacción: si falla, hace rollback y reporta el error.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient } from 'pg';
import platformPrisma from '../config/platform-prisma';

const MIGRATION_DIR = path.resolve(__dirname, '../../prisma/tenant-migrations');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATION_DIR)) {
    throw new Error(`Directorio de migraciones no encontrado: ${MIGRATION_DIR}`);
  }
  return fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.sql')).sort();
}

async function ensureTrackingTable(client: PoolClient, schemaName: string): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."_tenant_migrations" (
      id          SERIAL       PRIMARY KEY,
      filename    TEXT         NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: PoolClient, schemaName: string): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>(
    `SELECT filename FROM "${schemaName}"."_tenant_migrations" ORDER BY filename`,
  );
  return new Set(rows.map(r => r.filename));
}

async function applyMigration(
  pool: Pool,
  schemaName: string,
  filename: string,
  sql: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL es transaction-scoped: se revierte automáticamente al hacer COMMIT/ROLLBACK
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
    await client.query(sql);
    await client.query(
      `INSERT INTO "_tenant_migrations" (filename) VALUES ($1)`,
      [filename],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun     = process.argv.includes('--dry-run');
  const targetSlug = process.argv.find(a => a.startsWith('--tenant='))?.split('=')[1];

  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL no está configurado.');
    process.exit(1);
  }

  const migrationFiles = getMigrationFiles();
  console.log(`\nMigraciones disponibles (${migrationFiles.length}):`);
  migrationFiles.forEach(f => console.log(`  · ${f}`));

  const tenants = await platformPrisma.tenant.findMany({
    where: targetSlug
      ? { slug: targetSlug, status: 'ACTIVE' }
      : { status: 'ACTIVE' },
    select: { id: true, slug: true, schemaName: true },
    orderBy: { slug: 'asc' },
  });

  if (tenants.length === 0) {
    console.log(targetSlug
      ? `\n⚠  Tenant "${targetSlug}" no encontrado o no está activo.`
      : '\n⚠  No hay tenants activos.',
    );
    return;
  }

  console.log(`\nTenants a procesar: ${tenants.length}${dryRun ? '  (dry-run — no se aplicará nada)' : ''}`);

  const baseUrl = process.env.DATABASE_URL
    .replace(/[?&]schema=[^&]*/, '')
    .replace(/^([^?]*)&/, '$1?');
  const pool = new Pool({ connectionString: baseUrl });
  let hasError = false;

  for (const tenant of tenants) {
    console.log(`\n── ${tenant.slug}  (${tenant.schemaName}) ──`);
    const client = await pool.connect();

    try {
      if (!dryRun) {
        await ensureTrackingTable(client, tenant.schemaName);
      }

      const applied = dryRun
        ? new Set<string>()
        : await getAppliedMigrations(client, tenant.schemaName);

      client.release();

      let pendingCount = 0;
      for (const filename of migrationFiles) {
        if (applied.has(filename)) {
          console.log(`   ⏭  ${filename}`);
          continue;
        }

        pendingCount++;
        const sqlPath = path.join(MIGRATION_DIR, filename);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        if (dryRun) {
          console.log(`   🔍 ${filename}  (pendiente)`);
          continue;
        }

        process.stdout.write(`   ⏳ ${filename} ... `);
        await applyMigration(pool, tenant.schemaName, filename, sql);
        console.log('✓');
      }

      if (pendingCount === 0 && !dryRun) {
        console.log('   ✓ Sin cambios pendientes');
      }
    } catch (err) {
      // client may still be held if error occurred before release()
      try { client.release(); } catch { /* already released */ }
      console.error(`\n   ✗ Error en ${tenant.slug}:`, (err as Error).message);
      hasError = true;
    }
  }

  await pool.end();
  await platformPrisma.$disconnect();

  if (hasError) {
    console.error('\n⚠  Algunas migraciones fallaron. Revisa los errores arriba.');
    process.exit(1);
  } else {
    console.log('\n✅  Migraciones completadas.');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
