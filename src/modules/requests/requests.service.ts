import { PrismaClient, RequestStatus, RequestType } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

// Campos que un empleado puede solicitar cambiar en su perfil.
// Lista blanca explícita — previene que un usuario malicioso modifique role, salary, etc.
// documentId se excluye intencionalmente: tiene @unique en BD y requiere
// verificación física del documento — HR debe actualizarlo manualmente.
const ALLOWED_PROFILE_FIELDS = [
  // Datos personales
  'firstName', 'middleName', 'lastName', 'secondLastName',
  'birthDate', 'gender', 'maritalStatus', 'nationality', 'academicLevel',
  'birthCountry', 'birthRegion', 'birthDistrict',
  'licenseNumber', 'documentType',
  'docAddress', 'docDistrict', 'docDepartment', 'docAddressRef',
  // Domicilio
  'address', 'district', 'province', 'departmentdirec', 'addressRef',
  // Financiero
  'afpType', 'afpEntity', 'afpCommission', 'bankEntity', 'bankAccount', 'bankCci',
] as const;

export interface CreateRequestPayload {
  type:       RequestType;
  startDate?: string;
  endDate?:   string;
  reason?:    string;
  data?:      Record<string, unknown>;
}

export interface RequestFilters {
  status?: RequestStatus;
  type?:   RequestType;
  search?: string;
  page?:   number;
  limit?:  number;
}

export class RequestsService {

  async createRequest(payload: CreateRequestPayload, userId: string, db: PrismaClient) {
    return db.request.create({
      data: {
        type:      payload.type,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate:   payload.endDate   ? new Date(payload.endDate)   : null,
        reason:    payload.reason,
        data:      (payload.data ?? {}) as object,
        status:    'PENDING',
        userId,
      },
    });
  }

  async getMyRequests(userId: string, db: PrismaClient) {
    return db.request.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllRequests(db: PrismaClient, filters: RequestFilters = {}) {
    const page  = Math.max(1, Number(filters.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip  = (page - 1) * limit;

    const where: any = {
      ...(filters.status && { status: filters.status }),
      ...(filters.type   && { type:   filters.type   }),
    };

    if (filters.search) {
      const q = filters.search.trim();
      where.user = {
        employee: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { documentId:{ contains: q, mode: 'insensitive' } },
          ],
        },
      };
    }

    const include = {
      user: {
        select: {
          email:    true,
          employee: {
            select: {
              firstName:  true,
              lastName:   true,
              documentId: true,
              position:   { select: { name: true } },
            },
          },
        },
      },
    };

    const [total, data] = await db.$transaction([
      db.request.count({ where }),
      db.request.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateRequestStatus(
    requestId: string,
    status:    RequestStatus,
    reason:    string | undefined,
    db:        PrismaClient,
  ) {
    return db.$transaction(async (tx) => {
      const request = await tx.request.findUnique({ where: { id: requestId } });

      if (!request) throw new AppError('Solicitud no encontrada.', 404, 'REQUEST_NOT_FOUND');
      if (request.status !== 'PENDING') throw new AppError('Esta solicitud ya fue procesada.', 400, 'REQUEST_ALREADY_PROCESSED');

      // Cuando se aprueba una solicitud de cambio de perfil, aplicar los cambios al empleado.
      if (status === 'APPROVED' && request.type === 'PROFILE_UPDATE') {
        await this.applyProfileUpdate(tx, request.userId, request.data);
      }

      return tx.request.update({
        where: { id: requestId },
        data:  { status, reason: reason ?? request.reason },
      });
    });
  }

  async getVacationBalance(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({
      where:  { userId },
      select: { id: true, hireDate: true },
    });

    if (!employee) throw new AppError('Empleado no encontrado.', 404, 'EMPLOYEE_NOT_FOUND');

    const today         = new Date();
    const monthsWorked  = this.calculateMonthDiff(employee.hireDate, today);
    const daysEarned    = monthsWorked * 2.5;

    const approvedVacations = await db.request.findMany({
      where: { userId, type: 'VACATION', status: 'APPROVED' },
    });

    const daysUsed = approvedVacations.reduce((total, req) => {
      if (!req.startDate || !req.endDate) return total;
      return total + this.calculateDaysDiff(req.startDate, req.endDate) + 1;
    }, 0);

    return {
      hireDate:     employee.hireDate,
      monthsWorked,
      daysEarned,
      daysUsed,
      balance:      parseFloat((daysEarned - daysUsed).toFixed(2)),
    };
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  /**
   * Aplica los cambios de perfil aprobados al empleado.
   * Solo acepta campos de la lista blanca ALLOWED_PROFILE_FIELDS.
   */
  private async applyProfileUpdate(
    tx:     Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    userId: string,
    rawData: unknown,
  ) {
    if (!rawData || typeof rawData !== 'object') return;

    const changes  = rawData as Record<string, unknown>;
    const safeData: Record<string, unknown> = {};

    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (!(field in changes) || changes[field] === undefined) continue;
      safeData[field] = field === 'birthDate' && typeof changes[field] === 'string'
        ? new Date(changes[field] as string)
        : changes[field];
    }

    if (Object.keys(safeData).length === 0) return;

    await tx.employee.update({ where: { userId }, data: safeData });
  }

  private calculateMonthDiff(from: Date, to: Date): number {
    let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (to.getDate() < from.getDate()) months--;
    return Math.max(0, months);
  }

  private calculateDaysDiff(start: Date, end: Date): number {
    return Math.round(Math.abs(start.getTime() - end.getTime()) / 86_400_000);
  }
}
