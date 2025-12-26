import { PrismaClient, SystemRole } from '@prisma/client'; // Importamos SystemRole
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando semilla del sistema SaaS...');

  // 1. CREAR EL TENANT (La Empresa "Demo")
  // Usamos upsert para no duplicar si se corre varias veces
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Emplix Demo Corp',
      slug: 'demo',
      type: 'SHARED', // Vivirá en la DB compartida
      status: 'ACTIVE'
    }
  });

  console.log(`🏢 Empresa creada: ${demoTenant.name} (ID: ${demoTenant.id})`);

  // 2. CREAR DEPARTAMENTOS (Vinculados al Tenant)
  const techDept = await prisma.department.upsert({
    where: {
      // OJO: La clave única ahora es compuesta (name + tenantId)
      name_tenantId: {
        name: 'Tecnología',
        tenantId: demoTenant.id
      }
    },
    update: {},
    create: {
      name: 'Tecnología',
      description: 'Departamento de TI y Desarrollo',
      tenantId: demoTenant.id // <--- CRÍTICO
    }
  });

  const hrDept = await prisma.department.upsert({
    where: {
      name_tenantId: {
        name: 'Recursos Humanos',
        tenantId: demoTenant.id
      }
    },
    update: {},
    create: {
      name: 'Recursos Humanos',
      description: 'Gestión de Talento',
      tenantId: demoTenant.id
    }
  });

  console.log('📂 Departamentos creados');

  // 3. CREAR CARGOS
  // Como 'name' en Position ya no es unique globalmente (debería ser unique por tenant),
  // para simplificar el seed usaremos createMany o búsquedas simples.
  // Si en tu schema Position no tiene @@unique([name, tenantId]), upsert no funciona por nombre.
  // Asumiremos creación directa o búsqueda manual para este ejemplo rápido.
  
  let devPos = await prisma.position.findFirst({
    where: { name: 'Desarrollador Full Stack', tenantId: demoTenant.id }
  });

  if (!devPos) {
    devPos = await prisma.position.create({
      data: {
        name: 'Desarrollador Full Stack',
        tenantId: demoTenant.id,
        departmentId: techDept.id
      }
    });
  }

  let managerPos = await prisma.position.findFirst({
    where: { name: 'Gerente General', tenantId: demoTenant.id }
  });

  if (!managerPos) {
    managerPos = await prisma.position.create({
      data: {
        name: 'Gerente General',
        tenantId: demoTenant.id,
        // Sin departamento específico o el que quieras
      }
    });
  }

  console.log('💼 Cargos creados');

  // 4. CREAR USUARIO ADMIN
  const adminEmail = 'admin@emplix.com';
  const hashedPassword = await argon2.hash('Admin123');

  const adminUser = await prisma.user.upsert({
    where: {
      // Clave compuesta email + tenantId
      email_tenantId: {
        email: adminEmail,
        tenantId: demoTenant.id
      }
    },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      role: 'COMPANY_ADMIN', // Admin de ESTA empresa
      tenantId: demoTenant.id,
      
      // Crear Empleado vinculado al mismo tiempo
      employee: {
        create: {
          firstName: 'Admin',
          lastName: 'System',
          hireDate: new Date(),
          documentId: '00000001', // ID ficticio
          personalEmail: 'admin.personal@gmail.com',
          tenantId: demoTenant.id,
          positionId: managerPos.id,
          // departmentId: opcional
        }
      }
    }
  });

  console.log(`👤 Usuario Admin creado: ${adminEmail} (Pass: Admin123)`);
  console.log('✅ Semilla completada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });