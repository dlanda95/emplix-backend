import { PrismaClient, FamilyRelationship } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface FamilyMemberPayload {
  firstName:    string;
  lastName:     string;
  relationship: FamilyRelationship;
  documentType?: string;
  documentId?:   string;
  birthDate?:    string;
  phone?:        string;
  isDependent?:  boolean;
  isHeir?:       boolean;
}

async function findEmployee(userId: string, db: PrismaClient) {
  const employee = await db.employee.findUnique({ where: { userId } });
  if (!employee) throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

export async function getAll(userId: string, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  return db.familyMember.findMany({
    where:   { employeeId: employee.id },
    orderBy: { createdAt: 'asc' },
  });
}

export async function create(userId: string, payload: FamilyMemberPayload, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  return db.familyMember.create({
    data: {
      employeeId:   employee.id,
      firstName:    payload.firstName,
      lastName:     payload.lastName,
      relationship: payload.relationship,
      documentType: payload.documentType ?? 'DNI',
      documentId:   payload.documentId   ?? null,
      birthDate:    payload.birthDate    ? new Date(payload.birthDate) : null,
      phone:        payload.phone        ?? null,
      isDependent:  payload.isDependent  ?? false,
      isHeir:       payload.isHeir       ?? false,
    },
  });
}

export async function update(
  id:      string,
  userId:  string,
  payload: Partial<FamilyMemberPayload>,
  db:      PrismaClient,
) {
  const employee = await findEmployee(userId, db);
  const existing = await db.familyMember.findFirst({ where: { id, employeeId: employee.id } });
  if (!existing) throw new AppError('Familiar no encontrado', 404, 'FAMILY_MEMBER_NOT_FOUND');

  return db.familyMember.update({
    where: { id },
    data: {
      ...(payload.firstName    !== undefined && { firstName:    payload.firstName }),
      ...(payload.lastName     !== undefined && { lastName:     payload.lastName }),
      ...(payload.relationship !== undefined && { relationship: payload.relationship }),
      ...(payload.documentType !== undefined && { documentType: payload.documentType }),
      ...(payload.documentId   !== undefined && { documentId:   payload.documentId || null }),
      ...(payload.phone        !== undefined && { phone:        payload.phone || null }),
      ...(payload.isDependent  !== undefined && { isDependent:  payload.isDependent }),
      ...(payload.isHeir       !== undefined && { isHeir:       payload.isHeir }),
      ...(payload.birthDate    !== undefined && {
        birthDate: payload.birthDate ? new Date(payload.birthDate) : null,
      }),
    },
  });
}

export async function remove(id: string, userId: string, db: PrismaClient) {
  const employee = await findEmployee(userId, db);
  const existing = await db.familyMember.findFirst({ where: { id, employeeId: employee.id } });
  if (!existing) throw new AppError('Familiar no encontrado', 404, 'FAMILY_MEMBER_NOT_FOUND');

  await db.familyMember.delete({ where: { id } });
}
