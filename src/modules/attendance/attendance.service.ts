import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export class AttendanceService {

  async getTodayStatus(userId: string, db: PrismaClient) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const record = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });

    return {
      status: record ? (record.checkOut ? 'COMPLETED' : 'WORKING') : 'NOT_STARTED',
      record,
    };
  }

  async clockIn(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const existing = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });
    if (existing) throw new AppError('Ya has marcado tu entrada hoy.', 400);

    return db.attendance.create({
      data: { employeeId: employee.id, date: today, checkIn: now, status: 'PRESENT_ON_TIME' },
    });
  }

  async clockOut(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const record = await db.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });
    if (!record) throw new AppError('No has marcado entrada hoy.', 400);
    if (record.checkOut) throw new AppError('Ya has marcado tu salida hoy.', 400);

    return db.attendance.update({ where: { id: record.id }, data: { checkOut: now } });
  }

  async getDailyReport(date: Date, db: PrismaClient) {
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    const employees = await db.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true,
        position: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { lastName: 'asc' },
    });

    const logs = await db.attendance.findMany({ where: { date: reportDate } });

    return employees.map(emp => {
      const log = logs.find(a => a.employeeId === emp.id);
      let status = 'AUSENTE';
      if (log?.checkIn) {
        const checkInMins = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
        status = checkInMins > 9 * 60 + 15 ? 'TARDE' : 'PUNTUAL';
      }
      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        initials: (emp.firstName[0] + emp.lastName[0]).toUpperCase(),
        position: emp.position?.name ?? 'S/C',
        department: emp.department?.name ?? 'General',
        checkIn: log?.checkIn ?? null,
        checkOut: log?.checkOut ?? null,
        status,
      };
    });
  }

  async getMyAttendanceHistory(userId: string, from: Date, to: Date, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const logs = await db.attendance.findMany({
      where: { employeeId: employee.id, date: { gte: from, lte: to } },
      orderBy: { date: 'desc' },
    });

    return logs.map(log => {
      let status = 'PUNTUAL';
      let hoursWorked = 0;
      if (log.checkIn) {
        const mins = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
        if (mins > 9 * 60 + 15) status = 'TARDE';
        if (log.checkOut) {
          hoursWorked = Math.round(((log.checkOut.getTime() - log.checkIn.getTime()) / 3_600_000) * 100) / 100;
        }
      } else {
        status = 'SIN_MARCA';
      }
      return { id: log.id, date: log.date, checkIn: log.checkIn, checkOut: log.checkOut, status, hoursWorked };
    });
  }
}
