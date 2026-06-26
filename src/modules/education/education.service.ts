import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface EducationPayload {
  level:       string;
  institution: string;
  program:     string;
  startYear:   number;
  endYear?:    number | null;
  status?:     string;
  country?:    string | null;
}

async function findEmployee(userId: string, db: PrismaClient) {
  const employee = await db.employee.findUnique({ where: { userId } });
  if (!employee) throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

export async function getAll(userId: string, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  return db.education.findMany({
    where:   { employeeId: employee.id },
    orderBy: { startYear: 'desc' },
  });
}

export async function create(userId: string, payload: EducationPayload, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  return db.education.create({
    data: {
      employeeId:  employee.id,
      level:       payload.level,
      institution: payload.institution,
      program:     payload.program,
      startYear:   payload.startYear,
      endYear:     payload.endYear   ?? null,
      status:      payload.status    ?? 'COMPLETED',
      country:     payload.country   ?? 'Perú',
    },
  });
}

export async function update(
  id:      string,
  userId:  string,
  payload: Partial<EducationPayload>,
  db:      PrismaClient,
) {
  const employee = await findEmployee(userId, db);
  const existing = await db.education.findFirst({ where: { id, employeeId: employee.id } });
  if (!existing) throw new AppError('Registro académico no encontrado', 404, 'EDUCATION_NOT_FOUND');

  return db.education.update({
    where: { id },
    data: {
      ...(payload.level       !== undefined && { level:       payload.level       }),
      ...(payload.institution !== undefined && { institution: payload.institution }),
      ...(payload.program     !== undefined && { program:     payload.program     }),
      ...(payload.startYear   !== undefined && { startYear:   payload.startYear   }),
      ...(payload.status      !== undefined && { status:      payload.status      }),
      ...(payload.endYear     !== undefined && { endYear:     payload.endYear || null  }),
      ...(payload.country     !== undefined && { country:     payload.country || null }),
    },
  });
}

export async function remove(id: string, userId: string, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  const existing = await db.education.findFirst({ where: { id, employeeId: employee.id } });
  if (!existing) throw new AppError('Registro académico no encontrado', 404, 'EDUCATION_NOT_FOUND');

  await db.education.delete({ where: { id } });
}
