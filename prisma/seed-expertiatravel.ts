/**
 * Seed inicial para el tenant expertiatravel.
 * Uso: npx ts-node prisma/seed-expertiatravel.ts
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { tenantPrismaManager } from '../src/config/tenant-prisma-manager';
import type { PrismaClient } from '../src/generated/tenant-client';

const SCHEMA = 'tenant_expertiatravel';

const DEPARTMENTS = [
  { name: 'Tecnología',       code: 'TEC' },
  { name: 'Recursos Humanos', code: 'RH'  },
  { name: 'Comercial',        code: 'COM' },
  { name: 'Finanzas',         code: 'FIN' },
  { name: 'Operaciones',      code: 'OPS' },
];

const POSITIONS = [
  { name: 'Gerente General',      dept: null               },
  { name: 'Analista de RRHH',     dept: 'Recursos Humanos' },
  { name: 'Analista de Sistemas', dept: 'Tecnología'       },
  { name: 'Ejecutivo Comercial',  dept: 'Comercial'        },
  { name: 'Analista Financiero',  dept: 'Finanzas'         },
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

const USERS = [
  { email: 'diego.landa@expertiatravel.com', firstName: 'Diego', lastName: 'Landa', role: 'COMPANY_ADMIN' as const },
  { email: 'luis.vega@expertiatravel.com',   firstName: 'Luis',  lastName: 'Vega',  role: 'COMPANY_ADMIN' as const },
];

const DEFAULT_PASSWORD = 'Expertia2025!';

async function main() {
  console.log('\n🌱  Seed expertiatravel\n');

  const db = tenantPrismaManager.getClient(SCHEMA) as PrismaClient;

  const deptMap: Record<string, string> = {};
  for (const d of DEPARTMENTS) {
    const dept = await db.department.upsert({ where: { name: d.name }, update: {}, create: { name: d.name, code: d.code } });
    deptMap[d.name] = dept.id;
  }
  console.log(`  ✓ ${DEPARTMENTS.length} departamentos`);

  const posMap: Record<string, string> = {};
  for (const p of POSITIONS) {
    const pos = await db.position.upsert({
      where: { name: p.name }, update: {},
      create: { name: p.name, departmentId: p.dept ? deptMap[p.dept] : null },
    });
    posMap[p.name] = pos.id;
  }
  console.log(`  ✓ ${POSITIONS.length} posiciones`);

  for (const c of CONTRACT_TYPES) {
    await db.contractType.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  console.log(`  ✓ ${CONTRACT_TYPES.length} tipos de contrato`);

  for (const s of WORK_SHIFTS) {
    await db.workShift.upsert({
      where: { name: s.name }, update: {},
      create: { name: s.name, startTime: s.startTime ?? undefined, endTime: s.endTime ?? undefined, breakTime: s.breakTime, tolerance: s.tolerance },
    });
  }
  console.log(`  ✓ ${WORK_SHIFTS.length} turnos\n`);

  const hash = await argon2.hash(DEFAULT_PASSWORD);
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email }, update: {},
      create: { email: u.email, passwordHash: hash, role: u.role },
    });
    await db.employee.upsert({
      where: { userId: user.id }, update: {},
      create: { firstName: u.firstName, lastName: u.lastName, hireDate: new Date(), userId: user.id, positionId: posMap['Gerente General'] },
    });
    console.log(`  ✓ ${u.firstName} ${u.lastName} <${u.email}> [${u.role}]`);
  }

  console.log(`\n  Contraseña inicial: ${DEFAULT_PASSWORD}`);
  console.log('\n✅  Seed completado.\n');
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .then(() => process.exit(0));
