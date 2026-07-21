import * as argon2 from 'argon2';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import { sendMail, buildCandidateWelcomeEmail } from '../../shared/services/mailer.service';
import { generateSecurePassword } from '../../shared/utils/crypto.util';

export interface CreateCandidateDto {
  firstName:           string;
  lastName:            string;
  middleName?:         string;
  documentType:        string;
  documentId:          string;
  personalEmail:       string;
  hireDate:            string;
  positionId?:         string;
  departmentId?:       string;
  supervisorId?:       string;
  selectionProcessId?: string;
}

export interface CreateCandidateResult {
  employee:          Record<string, unknown>;
  temporaryPassword: string;
  emailSent:         boolean;
  emailError?:       string;
}

export class CandidatesService {

  async createCandidate(data: CreateCandidateDto, db: PrismaClient): Promise<CreateCandidateResult> {
    // Verificar duplicado por documento (login)
    const existing = await db.user.findUnique({ where: { email: data.documentId } });
    if (existing) throw new AppError('Ya existe un candidato o empleado con ese número de documento.', 409, 'DOCUMENT_TAKEN');

    const docExisting = await db.employee.findFirst({ where: { documentId: data.documentId } });
    if (docExisting) throw new AppError('El número de documento ya está registrado.', 409, 'DOCUMENT_TAKEN');

    // Contraseña segura aleatoria — se hashea; el plain text se retorna una sola vez
    const temporaryPassword = generateSecurePassword();
    const tempHash = await argon2.hash(temporaryPassword);

    const employee = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:        data.documentId,   // login con nro. de documento
          passwordHash: tempHash,
          role:         'EMPLOYEE',
          isActive:     true,
        },
      });

      return tx.employee.create({
        data: {
          userId:          user.id,
          firstName:       data.firstName,
          lastName:        data.lastName,
          middleName:      data.middleName,
          documentType:    data.documentType,
          documentId:      data.documentId,
          personalEmail:   data.personalEmail,
          hireDate:        new Date(data.hireDate),
          status:              'SELECTED',
          onboardingStatus:    'PENDING_DOCS',
          positionId:          data.positionId          ?? undefined,
          departmentId:        data.departmentId        ?? undefined,
          supervisorId:        data.supervisorId        ?? undefined,
          // selectionProcessId disponible tras: prisma generate --schema=prisma/tenant.prisma
          ...(data.selectionProcessId ? { selectionProcessId: data.selectionProcessId } : {}),
        } as any,
        include: {
          position:   true,
          department: true,
          user:       { select: { email: true, role: true, isActive: true } },
        },
      });
    });

    // ── Envío de email de bienvenida ──────────────────────────────────────────
    // Si falla el envío el candidato queda registrado igual; se retorna emailSent: false.
    let emailSent = false;
    let emailError: string | undefined;

    try {
      await sendMail({
        to:      data.personalEmail,
        subject: 'Acceso a Plataforma de Reclutamiento — Emplix',
        html:    buildCandidateWelcomeEmail({
          candidateName: `${data.firstName} ${data.lastName}`,
          username:      data.documentId,
          password:      temporaryPassword,
          loginUrl:      process.env['APP_URL'] ?? 'https://emplix.app/auth/login',
        }),
      });
      emailSent = true;
    } catch (err: unknown) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error('[candidates] Email de bienvenida no enviado', {
        to:        data.personalEmail,
        candidate: `${data.firstName} ${data.lastName}`,
        error:     emailError,
      });
    }

    return { employee: employee as unknown as Record<string, unknown>, temporaryPassword, emailSent, emailError };
  }

  async listCandidates(
    db: PrismaClient,
    params: { page?: number; limit?: number; search?: string; onboardingStatus?: string } = {},
  ) {
    const page  = Math.max(1, Number(params.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip  = (page - 1) * limit;

    const where: any = { status: 'SELECTED' };
    if (params.onboardingStatus) where.onboardingStatus = params.onboardingStatus;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { documentId:{ contains: q, mode: 'insensitive' } },
      ];
    }

    const include = {
      position:   { select: { name: true } },
      department: { select: { name: true } },
      user:       { select: { email: true, isActive: true } },
      documents:  { where: { type: 'AVATAR' as const }, take: 1, orderBy: { createdAt: 'desc' as const }, select: { path: true } },
    };

    const [total, data] = await db.$transaction([
      db.employee.count({ where }),
      db.employee.findMany({ where, include, orderBy: { createdAt: 'desc' as const }, skip, take: limit }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getCandidate(employeeId: string, db: PrismaClient) {
    const candidate = await db.employee.findFirst({
      where:   { id: employeeId },
      include: {
        position:   true,
        department: { include: { parent: { select: { id: true, name: true } } } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user:       { select: { email: true, role: true, isActive: true } },
        laborData:  { include: { contractType: true, workShift: true } },
        documents:  { where: { type: { not: 'AVATAR' } }, orderBy: { createdAt: 'desc' } },
        familyMembers: true,
        educations:    true,
        selectionProcess: {
          select: {
            id:   true,
            code: true,
            department: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
            position:   { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'CANDIDATE_NOT_FOUND');
    return candidate;
  }

  async updateHrData(employeeId: string, data: Record<string, unknown>, db: PrismaClient) {
    const candidate = await db.employee.findFirst({ where: { id: employeeId, status: 'SELECTED' } });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'CANDIDATE_NOT_FOUND');

    const HR_FIELDS = new Set(['positionId', 'departmentId', 'supervisorId']);
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

  async activateCandidate(employeeId: string, corporateEmail: string, db: PrismaClient) {
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
      await tx.user.update({
        where: { id: candidate.userId! },
        data:  { email: corporateEmail, passwordHash: null },
      });
      return tx.employee.update({
        where:   { id: employeeId },
        data:    { status: 'ACTIVE', onboardingStatus: 'COMPLETED' },
        include: { position: true, department: true, user: { select: { email: true } } },
      });
    });
  }
}
