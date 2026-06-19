/**
 * dev-seed.ts
 *
 * Script de datos de desarrollo para el tenant "techgans".
 * Crea departamentos, cargos, contratos y turnos si no existen,
 * y enriquece todos los empleados del tenant con datos realistas
 * para que el Histórico Laboral tenga eventos visibles.
 *
 * Uso:  npx ts-node prisma/dev-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Parámetros ───────────────────────────────────────────────────────────────
const TENANT_SLUG = 'techgans';

// Fechas para dar historia al timeline
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const HIRE_DATE          = daysAgo(540);  // ~18 meses atrás
const LABOR_UPDATE_DATE  = daysAgo(360);  // ~12 meses atrás (fin de periodo de prueba)

// ─── Catálogos ────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Tecnología',          code: 'TEC', description: 'Desarrollo de software y sistemas' },
  { name: 'Recursos Humanos',    code: 'RH',  description: 'Gestión del talento humano'         },
  { name: 'Comercial',           code: 'COM', description: 'Ventas y relaciones comerciales'    },
  { name: 'Finanzas',            code: 'FIN', description: 'Contabilidad y finanzas'            },
];

const POSITIONS = [
  { name: 'Analista Junior',   dept: 'Tecnología'      },
  { name: 'Analista',          dept: 'Tecnología'      },
  { name: 'Analista Senior',   dept: 'Tecnología'      },
  { name: 'Líder Técnico',     dept: 'Tecnología'      },
  { name: 'Gerente de Área',   dept: null               },
  { name: 'Especialista RH',   dept: 'Recursos Humanos' },
  { name: 'Ejecutivo Comercial', dept: 'Comercial'     },
];

const CONTRACT_TYPES = [
  { name: 'Plazo Fijo',    code: 'PF',  hasBenefits: true,  isLaboral: true  },
  { name: 'Indeterminado', code: 'IND', hasBenefits: true,  isLaboral: true  },
  { name: 'Locación',      code: 'LOC', hasBenefits: false, isLaboral: false },
];

const WORK_SHIFTS = [
  { name: 'Administrativo',  startTime: '09:00', endTime: '18:00', breakTime: 60, tolerance: 10 },
  { name: 'Turno Mañana',    startTime: '08:00', endTime: '17:00', breakTime: 60, tolerance: 5  },
  { name: 'Turno Tarde',     startTime: '14:00', endTime: '22:00', breakTime: 60, tolerance: 5  },
  { name: 'Flexible',        startTime: null,    endTime: null,    breakTime: 60, tolerance: 30, isFiscalized: false },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  Dev-Seed para tenant "${TENANT_SLUG}"\n`);

  // 1. Obtener el tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) {
    console.error(`❌  Tenant "${TENANT_SLUG}" no encontrado. Ejecuta primero: npx prisma db seed`);
    process.exit(1);
  }
  console.log(`✅  Tenant encontrado: ${tenant.name} (${tenant.id})`);

  // 2. Crear Departamentos
  const deptMap: Record<string, string> = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { name_tenantId: { name: d.name, tenantId: tenant.id } },
      update: { description: d.description },
      create: { name: d.name, code: d.code, description: d.description, tenantId: tenant.id },
    });
    deptMap[d.name] = dept.id;
    console.log(`  📁  Departamento: ${dept.name}`);
  }

  // 3. Crear Cargos
  const posMap: Record<string, string> = {};
  for (const p of POSITIONS) {
    const pos = await prisma.position.upsert({
      where: { name_tenantId: { name: p.name, tenantId: tenant.id } },
      update: {},
      create: {
        name:         p.name,
        tenantId:     tenant.id,
        departmentId: p.dept ? deptMap[p.dept] : null,
      },
    });
    posMap[p.name] = pos.id;
    console.log(`  💼  Cargo: ${pos.name}`);
  }

  // 4. Crear Tipos de Contrato
  const contractMap: Record<string, string> = {};
  for (const c of CONTRACT_TYPES) {
    const ct = await prisma.contractType.upsert({
      where: { name_tenantId: { name: c.name, tenantId: tenant.id } },
      update: {},
      create: { name: c.name, code: c.code, hasBenefits: c.hasBenefits, isLaboral: c.isLaboral, tenantId: tenant.id },
    });
    contractMap[c.name] = ct.id;
    console.log(`  📄  Contrato: ${ct.name}`);
  }

  // 5. Crear Turnos (sin unique constraint → findFirst + create)
  const shiftMap: Record<string, string> = {};
  for (const s of WORK_SHIFTS) {
    let shift = await prisma.workShift.findFirst({
      where: { name: s.name, tenantId: tenant.id },
    });
    if (!shift) {
      shift = await prisma.workShift.create({
        data: {
          name:            s.name,
          tenantId:        tenant.id,
          isFiscalized:    s.isFiscalized ?? true,
          startTime:       s.startTime ?? undefined,
          endTime:         s.endTime   ?? undefined,
          breakTime:       s.breakTime,
          tolerance:       s.tolerance,
          allowsOvertime:  false,
        },
      });
    }
    shiftMap[s.name] = shift.id;
    console.log(`  🕐  Turno: ${shift.name}`);
  }

  // 6. Enriquecer empleados del tenant
  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: { laborData: true },
  });

  console.log(`\n👥  Enriqueciendo ${employees.length} empleado(s)...\n`);

  for (const emp of employees) {
    // Asignar departamento y cargo si no tienen
    const needsUpdate = !emp.departmentId || !emp.positionId;

    if (needsUpdate) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          hireDate:     HIRE_DATE,
          departmentId: deptMap['Tecnología'],
          positionId:   posMap['Analista'],
        },
      });
      console.log(`  ✏️   ${emp.firstName} ${emp.lastName} → Área: Tecnología | Cargo: Analista`);
    } else {
      // Solo actualizar hireDate para tener historia
      await prisma.employee.update({
        where: { id: emp.id },
        data: { hireDate: HIRE_DATE },
      });
      console.log(`  ✏️   ${emp.firstName} ${emp.lastName} → Fecha de ingreso actualizada`);
    }

    // Crear/actualizar labor data con fecha histórica
    if (!emp.laborData) {
      await prisma.employeeLaborData.create({
        data: {
          employeeId:     emp.id,
          contractTypeId: contractMap['Indeterminado'],
          workShiftId:    shiftMap['Administrativo'],
          hierarchyLevel: 'ANALISTA',
          startDate:      LABOR_UPDATE_DATE,
          salary:         3500.00,
          currency:       'PEN',
        },
      });
      console.log(`  📋  Labor data creada: Contrato Indeterminado, S/ 3500, desde ${LABOR_UPDATE_DATE.toLocaleDateString('es-PE')}`);
    } else {
      await prisma.employeeLaborData.update({
        where: { employeeId: emp.id },
        data: {
          contractTypeId: contractMap['Indeterminado'],
          workShiftId:    shiftMap['Administrativo'],
          hierarchyLevel: 'ANALISTA',
          startDate:      LABOR_UPDATE_DATE,
          salary:         3500.00,
        },
      });
      console.log(`  📋  Labor data actualizada: Contrato Indeterminado, S/ 3500`);
    }
  }

  console.log('\n🚀  Dev-Seed completado.\n');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Ahora reinicia el servidor: npm run dev');
  console.log('─────────────────────────────────────────────────────────\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
