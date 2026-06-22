import { PrismaClient, RequestStatus } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export class RequestsService {

  async createRequest(payload: any, userId: string, db: PrismaClient) {
    return db.request.create({
      data: {
        type: payload.type,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        reason: payload.reason,
        data: payload.data || {},
        status: 'PENDING',
        userId,
      },
    });
  }

  async getMyRequests(userId: string, db: PrismaClient) {
    return db.request.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async getAllRequests(db: PrismaClient, filters: any = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return db.request.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                documentId: true,
                position: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRequestStatus(requestId: string, status: RequestStatus, reason: string | undefined, db: PrismaClient) {
    return db.$transaction(async (tx) => {
      const request = await tx.request.findUnique({ where: { id: requestId } });
      if (!request) throw new AppError('Solicitud no encontrada', 404);
      if (request.status !== 'PENDING') throw new AppError('Esta solicitud ya fue procesada', 400);

      if (status === 'APPROVED' && request.type === 'PROFILE_UPDATE') {
        const changes = request.data as any;
        if (changes) {
          const { birthDate, ...rest } = changes;
          const dataToUpdate: any = { ...rest };
          if (birthDate) dataToUpdate.birthDate = new Date(birthDate);
          await tx.employee.update({ where: { userId: request.userId }, data: dataToUpdate });
        }
      }

      return tx.request.update({
        where: { id: requestId },
        data: { status, reason: reason || request.reason },
      });
    });
  }

  async getVacationBalance(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId }, select: { id: true, hireDate: true } });
    if (!employee) throw new Error('Empleado no encontrado');

    const today = new Date();
    const monthsWorked = this.monthDiff(employee.hireDate, today);
    const daysEarned = monthsWorked * 2.5;

    const approved = await db.request.findMany({ where: { userId, type: 'VACATION', status: 'APPROVED' } });
    let daysUsed = 0;
    approved.forEach(req => {
      if (req.startDate && req.endDate) daysUsed += this.daysDiff(req.startDate, req.endDate) + 1;
    });

    return {
      hireDate: employee.hireDate,
      monthsWorked,
      daysEarned,
      daysUsed,
      balance: parseFloat((daysEarned - daysUsed).toFixed(2)),
    };
  }

  private monthDiff(d1: Date, d2: Date): number {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 - d1.getMonth() + d2.getMonth();
    if (d2.getDate() < d1.getDate()) months--;
    return Math.max(0, months);
  }

  private daysDiff(start: Date, end: Date): number {
    return Math.round(Math.abs(start.getTime() - end.getTime()) / 86_400_000);
  }
}
