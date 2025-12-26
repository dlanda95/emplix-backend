import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware'; // Recomendado usar AppError

export class AttendanceService {

  // Obtener estado de hoy
  async getTodayStatus(userId: string, tenantId: string) {
    const today = new Date();
    
    // Buscar el empleado VALIDANDO EMPRESA
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const record = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        tenantId: tenantId, // <--- Filtro seguridad
        date: today 
      }
    });

    return {
      status: record ? (record.checkOut ? 'COMPLETED' : 'WORKING') : 'NOT_STARTED',
      record
    };
  }

  // Marcar Entrada (Clock In)
  async clockIn(userId: string, tenantId: string) {
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const today = new Date();

    // Validar duplicados
    const existing = await prisma.attendance.findFirst({
      where: { 
        employeeId: employee.id, 
        tenantId: tenantId,
        date: today 
      }
    });

    if (existing) throw new AppError('Ya has marcado tu entrada hoy.', 400);

    return await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        tenantId: tenantId, // <--- OBLIGATORIO
        date: today,
        checkIn: new Date()
      }
    });
  }

  // Marcar Salida (Clock Out)
  async clockOut(userId: string, tenantId: string) {
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const today = new Date();

    const record = await prisma.attendance.findFirst({
      where: { 
        employeeId: employee.id, 
        tenantId: tenantId,
        date: today 
      }
    });

    if (!record) throw new AppError('No has marcado entrada hoy.', 400);
    if (record.checkOut) throw new AppError('Ya has marcado tu salida hoy.', 400);

    return await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: new Date() }
    });
  }

  // NUEVO: Reporte Diario para Admin
  async getDailyReport(date: Date, tenantId: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Obtener Empleados (SOLO DE MI EMPRESA)
    const employees = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE',
        tenantId: tenantId // <--- Filtro crítico
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
        department: { select: { name: true } }
      },
      orderBy: { lastName: 'asc' }
    });

    // 3. Obtener Asistencias (SOLO DE MI EMPRESA)
    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        tenantId: tenantId, // <--- Filtro crítico
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 4. Cruzar información
    return employees.map(emp => {
      const log = attendanceLogs.find(a => a.employeeId === emp.id);
      
      let status = 'AUSENTE';
      if (log) {
        const checkInTime = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
        const limitTime = 9 * 60 + 15; // 9:15 AM
        status = checkInTime > limitTime ? 'TARDE' : 'PUNTUAL';
      }

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        initials: (emp.firstName[0] + emp.lastName[0]).toUpperCase(),
        position: emp.position?.name || 'S/C',
        department: emp.department?.name || 'General',
        checkIn: log?.checkIn || null,
        checkOut: log?.checkOut || null,
        status
      };
    });
  }

  // Obtener historial personal
  async getMyAttendanceHistory(userId: string, from: Date, to: Date, tenantId: string) {
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const logs = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        tenantId: tenantId, // <--- Seguridad
        date: {
          gte: from,
          lte: to
        }
      },
      orderBy: { date: 'desc' }
    });

    return logs.map(log => {
      let status = 'PUNTUAL';
      let hoursWorked = 0;

      const limitTime = 9 * 60 + 15; 
      const checkInMinutes = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
      
      if (checkInMinutes > limitTime) status = 'TARDE';

      if (log.checkOut) {
        const diffMs = log.checkOut.getTime() - log.checkIn.getTime();
        hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      }

      return {
        id: log.id,
        date: log.date,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        status,
        hoursWorked
      };
    });
  }
}