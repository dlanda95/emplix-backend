import { PrismaClient, SystemRole, AuthProvider, EmployeeStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Función auxiliar para crear una empresa completa
async function createTenantWithAdmin(
  name: string, 
  slug: string, 
  adminEmail: string, 
  adminName: string
) {
  console.log(`🏗️ Creando/Actualizando empresa: ${name} (${slug})...`);

  // 1. Crear o Buscar el Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: slug },
    update: {},
    create: {
      name: name,
      slug: slug,
      type: 'SHARED',
      status: 'ACTIVE'
    }
  });

  // 2. Crear Cargos Básicos para ESTA empresa (Recuerda que ahora son por tenant)
  const managerPos = await prisma.position.upsert({
    where: { name_tenantId: { name: 'Gerente General', tenantId: tenant.id } },
    update: {},
    create: {
      name: 'Gerente General',
      description: 'Encargado de todo',
      tenantId: tenant.id
    }
  });

  // 3. Crear el Usuario Admin
  const passwordHash = await argon2.hash('Admin123'); // Misma clave para todos para no complicarte

  const user = await prisma.user.upsert({
    where: {
      email_tenantId: { email: adminEmail, tenantId: tenant.id }
    },
    update: { 
      passwordHash, // Forzamos actualización de clave por si acaso
      isActive: true 
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: SystemRole.COMPANY_ADMIN,
      tenantId: tenant.id,
      employee: {
        create: {
          firstName: adminName,
          lastName: 'Admin',
          hireDate: new Date(),
          documentId: `DOC-${slug.toUpperCase()}`, // DNI ficticio único por empresa
          personalEmail: `admin@${slug}.com`,
          tenantId: tenant.id,
          positionId: managerPos.id,
          status: EmployeeStatus.ACTIVE
        }
      }
    }
  });

  console.log(`✅ Empresa ${name} lista. Admin: ${adminEmail}`);
  return tenant;
}

async function main() {
  console.log('🌱 Iniciando Seed Multi-Tenant...');

  // --- EMPRESA 1: DEMO (Tu entorno de desarrollo) ---
  await createTenantWithAdmin('Entorno Demo', 'demo', 'admin@demo.com', 'Demo');

  // --- EMPRESA 2: TECHGANS ---
  await createTenantWithAdmin('Techgans Solutions', 'techgans', 'diego@techgans.com', 'Diego');

  // --- EMPRESA 3: CONEXA ---
  await createTenantWithAdmin('Conexa Corp', 'conexa', 'admin@conexa.com', 'Admin Conexa');

  console.log('🚀 Seed finalizado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });