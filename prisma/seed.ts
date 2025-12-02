import { PrismaClient, SystemRole } from '@prisma/client'; // Importamos SystemRole
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos V2...');

  // 1. Crear Departamentos Base
  // Usamos upsert para no duplicar si se corre dos veces
  const depIT = await prisma.department.upsert({
    where: { name: 'Tecnología' },
    update: {},
    create: { name: 'Tecnología', description: 'Departamento de TI y Desarrollo' }
  });

  const depHR = await prisma.department.upsert({
    where: { name: 'Recursos Humanos' },
    update: {},
    create: { name: 'Recursos Humanos', description: 'Gestión de Talento' }
  });

  // 2. Crear Cargos Base
  const posDev = await prisma.position.upsert({
    where: { name: 'Desarrollador Full Stack' },
    update: {},
    create: { name: 'Desarrollador Full Stack' }
  });

  const posMgr = await prisma.position.upsert({
    where: { name: 'Gerente General' },
    update: {},
    create: { name: 'Gerente General' }
  });

  // 3. Crear Usuario Admin
  const passwordHash = await argon2.hash('admin123');

  const adminEmail = 'admin@rrhh.com';

  const userAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      role: 'GLOBAL_ADMIN', // Usamos el string directo o SystemRole.GLOBAL_ADMIN
      isActive: true
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'GLOBAL_ADMIN',
      // Creamos el perfil de empleado vinculado
      employee: {
        create: {
          firstName: 'Admin',
          lastName: 'Sistema',
          hireDate: new Date(),
          documentId: '00000001',
          departmentId: depIT.id,
          positionId: posMgr.id,
          personalEmail: 'admin.personal@gmail.com'
        }
      }
    }
  });

  console.log(`✅ Base de datos lista.`);
  console.log(`👤 Usuario: ${userAdmin.email} | Clave: admin123`);
  console.log(`📂 Estructura creada: Departamentos y Cargos listos.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });