import * as argon2 from 'argon2';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface CreateCandidateDto {
  firstName:    string;
  lastName:     string;
  middleName?:  string;
  documentType: string;   // DNI | CE | PASAPORTE | PTP
  documentId:   string;   // Número del documento (también será el login)
  hireDate:     string;   // Fecha estimada de ingreso
  positionId?:  string;
  departmentId?:string;
  supervisorId?:string;
}

export class CandidatesService {

  async createCandidate(data: CreateCandidateDto, db: PrismaClient) {
    const existing = await db.user.findUnique({ where: { email: data.documentId } });
    if (existing) throw new AppError('Ya existe un candidato o empleado con ese número de documento.', 409, 'DOCUMENT_TAKEN');

    const docExisting = await db.employee.findFirst({ where: { documentId: data.documentId } });
    if (docExisting) throw new AppError('El número de documento ya está registrado.', 409, 'DOCUMENT_TAKEN');

    // Contraseña temporal = número de documento
    const tempHash = await argon2.hash(data.documentId);

    return db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:        data.documentId,   // login con nro. de documento
          passwordHash: tempHash,
          role:         'EMPLOYEE',
          isActive:     true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId:          user.id,
          firstName:       data.firstName,
          lastName:        data.lastName,
          middleName:      data.middleName,
          documentType:    data.documentType,
          documentId:      data.documentId,
          hireDate:        new Date(data.hireDate),
          status:          'SELECTED',
          onboardingStatus:'PENDING_DOCS',
          positionId:      data.positionId   ?? undefined,
          departmentId:    data.departmentId ?? undefined,
          supervisorId:    data.supervisorId ?? undefined,
        },
        include: {
          position:   true,
          department: true,
          user:       { select: { email: true, role: true, isActive: true } },
        },
      });

      return { user: { id: user.id, email: user.email }, employee };
    });
  }

  async listCandidates(db: PrismaClient) {
    return db.employee.findMany({
      where:   { status: 'SELECTED' },
      include: {
        position:   { select: { name: true } },
        department: { select: { name: true } },
        user:       { select: { email: true, isActive: true } },
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCandidate(employeeId: string, db: PrismaClient) {
    const candidate = await db.employee.findFirst({
      where:   { id: employeeId, status: 'SELECTED' },
      include: {
        position:     true,
        department:   true,
        supervisor:   { select: { id: true, firstName: true, lastName: true } },
        user:         { select: { email: true, role: true, isActive: true } },
        laborData:    { include: { contractType: true, workShift: true } },
        documents:    { where: { type: { not: 'AVATAR' } }, orderBy: { createdAt: 'desc' } },
        familyMembers:true,
        educations:   true,
      },
    });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'CANDIDATE_NOT_FOUND');
    return candidate;
  }

  async updateHrData(employeeId: string, data: Record<string, unknown>, db: PrismaClient) {
    const candidate = await db.employee.findFirst({ where: { id: employeeId, status: 'SELECTED' } });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'CANDIDATE_NOT_FOUND');

    // Campos que solo RRHH puede completar para el candidato
    const HR_FIELDS = new Set([
      'positionId', 'departmentId', 'supervisorId',
    ]);

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (HR_FIELDS.has(key)) patch[key] = value ?? null;
    }

    return db.employee.update({
      where:   { id: employeeId },
      data:    patch,
      include: { position: true, department: true, supervisor: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async activateCandidate(
    employeeId: string,
    corporateEmail: string,
    db: PrismaClient,
  ) {
    const candidate = await db.employee.findFirst({
      where:   { id: employeeId, status: 'SELECTED' },
      include: { user: true },
    });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'CANDIDATE_NOT_FOUND');
    if (candidate.onboardingStatus !== 'DOCS_SUBMITTED') {
      throw new AppError('El candidato aún no ha completado su documentación.', 400, 'DOCS_NOT_SUBMITTED');
    }

    const emailConflict = await db.user.findFirst({
      where: { email: corporateEmail, id: { not: candidate.userId! } },
    });
    if (emailConflict) throw new AppError('El correo corporativo ya está en uso.', 409, 'EMAIL_TAKEN');

    return db.$transaction(async (tx) => {
      // Actualizar User: nuevo email corporativo, revocar contraseña temporal
      await tx.user.update({
        where: { id: candidate.userId! },
        data:  { email: corporateEmail, passwordHash: null },
      });

      // Activar employee
      return tx.employee.update({
        where:   { id: employeeId },
        data:    { status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
        include: { position: true, department: true, user: { select: { email: true } } },
      });
    });
  }
}
