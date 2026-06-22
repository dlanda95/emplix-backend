/**
 * Provisioning script — crea un nuevo tenant:
 *   1. Crea el schema de PostgreSQL: tenant_{slug}
 *   2. Ejecuta el DDL de las tablas de RRHH en ese schema
 *   3. Inserta el registro en la tabla platform.tenants
 *   4. Crea las TenantAuthConfig iniciales
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
import { Pool } from 'pg';
import { execSync } from 'child_process';
import * as path from 'path';
import platformPrisma from '../config/platform-prisma';

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

  // ── 1. Crear schema de PostgreSQL ─────────────────────────────────────────
  const baseUrl = process.env.DATABASE_URL!.replace(/[?&]schema=[^&]*/, '');
  const pool = new Pool({ connectionString: baseUrl });

  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`  ✓ Schema "${schemaName}" creado`);
  } finally {
    await pool.end();
  }

  // ── 2. Ejecutar DDL del tenant (prisma db push) ───────────────────────────
  const tenantUrl = `${baseUrl}?schema=${schemaName}`;
  const schemaFile = path.resolve(__dirname, '../../prisma/tenant.prisma');

  // Pasar la URL como env var (no en el string del shell) para evitar problemas con caracteres especiales
  execSync(
    `npx prisma db push --schema="${schemaFile}" --accept-data-loss --skip-generate`,
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL: tenantUrl } },
  );
  console.log(`  ✓ Tablas creadas en "${schemaName}"`);

  // ── 3. Registrar en platform.tenants ─────────────────────────────────────
  const existing = await platformPrisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.warn(`  ⚠ El tenant "${slug}" ya existe en la plataforma — omitiendo inserción.`);
  } else {
    const tenant = await platformPrisma.tenant.create({
      data: {
        slug,
        name,
        schemaName,
        plan: 'STARTER',
        status: 'ACTIVE',
      },
    });
    console.log(`  ✓ Tenant registrado: ${tenant.id}`);

    // ── 4. Auth configs iniciales ─────────────────────────────────────────
    if (enableEmail) {
      await platformPrisma.tenantAuthConfig.create({
        data: { tenantId: tenant.id, method: 'EMAIL', enabled: true },
      });
      console.log('  ✓ Auth EMAIL habilitado');
    }

    if (enableMicrosoft) {
      if (!azureTenantId) {
        console.warn('  ⚠ --azure-tenant-id requerido para habilitar MICROSOFT. Omitiendo.');
      } else {
        await platformPrisma.tenantAuthConfig.create({
          data: { tenantId: tenant.id, method: 'MICROSOFT', enabled: true, azureTenantId },
        });
        console.log(`  ✓ Auth MICROSOFT habilitado (Azure Tenant: ${azureTenantId})`);
      }
    }
  }

  await platformPrisma.$disconnect();
  console.log(`\nTenant "${slug}" provisionado correctamente.`);
}

main().catch(err => {
  console.error('Error en provisioning:', err);
  process.exit(1);
});
