/**
 * dev-seed.ts — Seed de datos para desarrollo (Pattern 2 Multi-Tenant)
 *
 * Crea usuarios admin, departamentos, cargos, turnos, contratos y empleados
 * de ejemplo en cada tenant provisionado.
 *
 * Uso: npx ts-node prisma/dev-seed.ts
 */

import * as argon2 from 'argon2';
import { platformPrisma } from '../src/config/platform-prisma';
import { tenantPrismaManager } from '../src/config/tenant-prisma-manager';
import type { PrismaClient } from '../src/generated/tenant-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ─── Catálogos compartidos ────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: 'Tecnología',       code: 'TEC', description: 'Desarrollo de software y sistemas' },
  { name: 'Recursos Humanos', code: 'RH',  description: 'Gestión del talento humano'        },
  { name: 'Comercial',        code: 'COM', description: 'Ventas y relaciones comerciales'   },
  { name: 'Finanzas',         code: 'FIN', description: 'Contabilidad y finanzas'           },
];

const POSITIONS = [
  { name: 'Analista Junior',    dept: 'Tecnología'       },
  { name: 'Analista Senior',    dept: 'Tecnología'       },
  { name: 'Líder Técnico',      dept: 'Tecnología'       },
  { name: 'Especialista RH',    dept: 'Recursos Humanos' },
  { name: 'Ejecutivo Comercial',dept: 'Comercial'        },
  { name: 'Gerente de Área',    dept: null               },
];

const CONTRACT_TYPES = [
  { name: 'Indeterminado', code: 'IND', hasBenefits: true,  isLaboral: true  },
  { name: 'Plazo Fijo',    code: 'PF',  hasBenefits: true,  isLaboral: true  },
  { name: 'Locación',      code: 'LOC', hasBenefits: false, isLaboral: false },
];

const WORK_SHIFTS = [
  { name: 'Administrativo', startTime: '09:00', endTime: '18:00', breakTime: 60, tolerance: 10 },
  { name: 'Turno Mañana',   startTime: '08:00', endTime: '17:00', breakTime: 60, tolerance: 5  },
  { name: 'Flexible',       startTime: null,    endTime: null,    breakTime: 60, tolerance: 30 },
];

// ─── Datos por tenant ─────────────────────────────────────────────────────────

interface TenantSeedConfig {
  admin: { email: string; firstName: string; lastName: string; password: string };
  employees: Array<{
    email: string; firstName: string; lastName: string;
    role: 'HR_MANAGER' | 'HR_ANALYST' | 'AREA_MANAGER' | 'EMPLOYEE';
    dept: string; position: string; salary: number; daysHired: number;
  }>;
}

const TENANT_DATA: Record<string, TenantSeedConfig> = {
  demo: {
    admin: { email: 'admin@demo.com', firstName: 'Admin', lastName: 'Demo', password: 'Admin123!' },
    employees: [
      { email: 'carlos.rrhh@demo.com',  firstName: 'Carlos',   lastName: 'Mendoza', role: 'HR_MANAGER',  dept: 'Recursos Humanos', position: 'Especialista RH',     salary: 4500, daysHired: 400 },
      { email: 'lucia.tec@demo.com',    firstName: 'Lucía',    lastName: 'Torres',  role: 'EMPLOYEE',    dept: 'Tecnología',       position: 'Analista Senior',     salary: 3800, daysHired: 300 },
      { email: 'pedro.com@demo.com',    firstName: 'Pedro',    lastName: 'Vega',    role: 'AREA_MANAGER',dept: 'Comercial',        position: 'Gerente de Área',     salary: 5500, daysHired: 600 },
      { email: 'sofia.junior@demo.com', firstName: 'Sofía',    lastName: 'Ruiz',    role: 'EMPLOYEE',    dept: 'Tecnología',       position: 'Analista Junior',     salary: 2800, daysHired: 90  },
      { email: 'juan.fin@demo.com',     firstName: 'Juan',     lastName: 'Ríos',    role: 'EMPLOYEE',    dept: 'Finanzas',         position: 'Analista Senior',     salary: 4000, daysHired: 200 },
    ],
  },
  techgans: {
    admin: { email: 'diego@techgans.com', firstName: 'Diego', lastName: 'García', password: 'Admin123!' },
    employees: [
      { email: 'ana.rrhh@techgans.com',  firstName: 'Ana',    lastName: 'López',    role: 'HR_MANAGER', dept: 'Recursos Humanos', position: 'Especialista RH',  salary: 5000, daysHired: 540 },
      { email: 'miguel.dev@techgans.com', firstName: 'Miguel', lastName: 'Sánchez', role: 'EMPLOYEE',   dept: 'Tecnología',       position: 'Analista Senior',  salary: 4200, daysHired: 360 },
      { email: 'valeria.tl@techgans.com', firstName: 'Valeria',lastName: 'Mora',   role: 'AREA_MANAGER',dept: 'Tecnología',       position: 'Líder Técnico',    salary: 6000, daysHired: 720 },
      { email: 'robert.jr@techgans.com',  firstName: 'Roberto',lastName: 'Díaz',   role: 'EMPLOYEE',   dept: 'Tecnología',       position: 'Analista Junior',  salary: 2600, daysHired: 60  },
    ],
  },
  conexa: {
    admin: { email: 'admin@conexa.com', firstName: 'Admin', lastName: 'Conexa', password: 'Admin123!' },
    employees: [
      { email: 'gaby.rrhh@conexa.com',  firstName: 'Gabriela', lastName: 'Castro',  role: 'HR_ANALYST', dept: 'Recursos Humanos', position: 'Especialista RH', salary: 3800, daysHired: 250 },
      { email: 'mario.com@conexa.com',  firstName: 'Mario',    lastName: 'Flores',  role: 'EMPLOYEE',   dept: 'Comercial',        position: 'Ejecutivo Comercial', salary: 3200, daysHired: 180 },
    ],
  },
  expertiatravel: {
    admin: { email: 'admin@expertiatravel.com', firstName: 'Admin', lastName: 'Expertia', password: 'Admin123!' },
    employees: [
      { email: 'rrhh@expertiatravel.com',    firstName: 'Recursos',  lastName: 'Humanos',  role: 'HR_MANAGER',  dept: 'Recursos Humanos', position: 'Especialista RH',     salary: 5000, daysHired: 365 },
      { email: 'comercial@expertiatravel.com',firstName: 'Ejecutivo', lastName: 'Comercial',role: 'EMPLOYEE',    dept: 'Comercial',        position: 'Ejecutivo Comercial', salary: 3500, daysHired: 180 },
      { email: 'tec@expertiatravel.com',      firstName: 'Analista',  lastName: 'Tech',     role: 'EMPLOYEE',    dept: 'Tecnología',       position: 'Analista Senior',     salary: 4000, daysHired: 240 },
    ],
  },
};

// ─── Seed para un tenant ──────────────────────────────────────────────────────

async function seedTenant(slug: string, schemaName: string, config: TenantSeedConfig) {
  const db = tenantPrismaManager.getClient(schemaName) as PrismaClient;

  // 1. Departamentos
  const deptMap: Record<string, string> = {};
  for (const d of DEPARTMENTS) {
    const dept = await db.department.upsert({
      where: { code: d.code },
      update: {},
      create: { name: d.name, code: d.code, description: d.description },
    });
    deptMap[d.name] = dept.id;
  }
  console.log(`  📁  ${Object.keys(deptMap).length} departamentos`);

  // 2. Cargos
  const posMap: Record<string, string> = {};
  for (const p of POSITIONS) {
    const pos = await db.position.upsert({
      where: { name: p.name },
      update: {},
      create: { name: p.name, departmentId: p.dept ? deptMap[p.dept] : null },
    });
    posMap[p.name] = pos.id;
  }
  console.log(`  💼  ${Object.keys(posMap).length} cargos`);

  // 3. Tipos de contrato
  const contractMap: Record<string, string> = {};
  for (const c of CONTRACT_TYPES) {
    const ct = await db.contractType.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, code: c.code, hasBenefits: c.hasBenefits, isLaboral: c.isLaboral },
    });
    contractMap[c.name] = ct.id;
  }
  console.log(`  📄  ${Object.keys(contractMap).length} tipos de contrato`);

  // 4. Turnos
  const shiftMap: Record<string, string> = {};
  for (const s of WORK_SHIFTS) {
    const shift = await db.workShift.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name, startTime: s.startTime ?? undefined,
        endTime: s.endTime ?? undefined, breakTime: s.breakTime, tolerance: s.tolerance,
      },
    });
    shiftMap[s.name] = shift.id;
  }
  console.log(`  🕐  ${Object.keys(shiftMap).length} turnos`);

  // 5. Admin user
  const adminHash = await argon2.hash(config.admin.password);
  const adminUser = await db.user.upsert({
    where: { email: config.admin.email },
    update: {},
    create: {
      email: config.admin.email, passwordHash: adminHash, role: 'COMPANY_ADMIN',
    },
  });

  const adminEmployee = await db.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      firstName: config.admin.firstName, lastName: config.admin.lastName,
      hireDate: daysAgo(800), userId: adminUser.id,
      departmentId: deptMap['Recursos Humanos'], positionId: posMap['Gerente de Área'],
    },
  });
  console.log(`  👤  Admin: ${config.admin.email} / ${config.admin.password}`);

  // Asignar leader al depto RH
  await db.department.update({
    where: { code: 'RH' },
    data: { leaderId: adminEmployee.id },
  });

  // 6. Empleados de ejemplo
  for (const emp of config.employees) {
    const hash = await argon2.hash('Emp123!');
    const user = await db.user.upsert({
      where: { email: emp.email },
      update: {},
      create: { email: emp.email, passwordHash: hash, role: emp.role },
    });

    const employee = await db.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        firstName: emp.firstName, lastName: emp.lastName,
        hireDate: daysAgo(emp.daysHired), userId: user.id,
        departmentId: deptMap[emp.dept], positionId: posMap[emp.position],
      },
    });

    // Labor data
    const existingLabor = await db.employeeLaborData.findUnique({ where: { employeeId: employee.id } });
    if (!existingLabor) {
      await db.employeeLaborData.create({
        data: {
          employeeId: employee.id,
          contractTypeId: contractMap['Indeterminado'],
          workShiftId: shiftMap['Administrativo'],
          hierarchyLevel: 'ANALISTA', salary: emp.salary, currency: 'PEN',
          startDate: daysAgo(emp.daysHired),
        },
      });
    }
    console.log(`  👤  ${emp.firstName} ${emp.lastName} <${emp.email}>`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Dev-Seed Multi-Tenant (Pattern 2)\n');

  const tenants = await platformPrisma.tenant.findMany({ where: { status: 'ACTIVE' } });
  console.log(`Tenants activos: ${tenants.map(t => t.slug).join(', ')}\n`);

  for (const tenant of tenants) {
    const config = TENANT_DATA[tenant.slug];
    if (!config) {
      console.log(`⚠️  Sin configuración para tenant "${tenant.slug}" — saltando\n`);
      continue;
    }

    console.log(`── Tenant: ${tenant.name} (${tenant.slug}) ──────────`);
    await seedTenant(tenant.slug, tenant.schemaName, config);
    console.log(`✅  ${tenant.name} listo\n`);
  }

  console.log('────────────────────────────────────────────────────────');
  console.log('🚀  Seed completado. Credenciales de acceso:\n');

  for (const [slug, cfg] of Object.entries(TENANT_DATA)) {
    const tenant = tenants.find(t => t.slug === slug);
    if (!tenant) continue;
    console.log(`  ${tenant.name} (tenant: ${slug})`);
    console.log(`    Admin → ${cfg.admin.email} / ${cfg.admin.password}`);
    cfg.employees.forEach(e => console.log(`    Emp   → ${e.email} / Emp123!`));
    console.log('');
  }
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => platformPrisma.$disconnect());
