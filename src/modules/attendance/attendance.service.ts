import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware';

export class AttendanceService {

  // Obtener estado de hoy
  async getTodayStatus(userId: string, tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 🔥 CLAVE: Normalizar a medianoche para coincidir con @db.Date
    
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    // Usamos findUnique porque definimos @@unique([employeeId, date])
    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });

    // Validación extra de seguridad
    if (record && record.tenantId !== tenantId) {
       throw new AppError('Acceso denegado', 403);
    }

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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // 🔥 Normalizar fecha

    const existing = await prisma.attendance.findUnique({
      where: { 
        employeeId_date: {
            employeeId: employee.id, 
            date: today
        }
      }
    });

    if (existing) throw new AppError('Ya has marcado tu entrada hoy.', 400);

    return await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        tenantId: tenantId,
        date: today,
        checkIn: now,
        status: 'PRESENT_ON_TIME' // Estado provisional
      }
    });
  }

  // Marcar Salida (Clock Out)
  async clockOut(userId: string, tenantId: string) {
    const employee = await prisma.employee.findFirst({ 
      where: { userId, tenantId } 
    });
    
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findUnique({
      where: { 
        employeeId_date: {
            employeeId: employee.id, 
            date: today
        }
      }
    });

    if (!record) throw new AppError('No has marcado entrada hoy.', 400);
    if (record.checkOut) throw new AppError('Ya has marcado tu salida hoy.', 400);

    return await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: now }
    });
  }

  // NUEVO: Reporte Diario para Admin
  async getDailyReport(date: Date, tenantId: string) {
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // 2. Obtener Empleados
    const employees = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE',
        tenantId: tenantId 
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

    // 3. Obtener Asistencias
    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        tenantId: tenantId,
        date: reportDate
      }
    });

    // 4. Cruzar información
    return employees.map(emp => {
      const log = attendanceLogs.find(a => a.employeeId === emp.id);
      
      let status = 'AUSENTE';
      
      // 🔥 FIX: Verificar que checkIn exista antes de usarlo
      if (log && log.checkIn) {
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
        tenantId: tenantId,
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

      // 🔥 FIX: Verificar que checkIn exista
      if (log.checkIn) {
        const limitTime = 9 * 60 + 15; 
        const checkInMinutes = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
        
        if (checkInMinutes > limitTime) status = 'TARDE';

        // Solo calculamos horas si hay checkOut Y checkIn
        if (log.checkOut) {
            const diffMs = log.checkOut.getTime() - log.checkIn.getTime();
            hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        }
      } else {
        status = 'SIN_MARCA'; // Manejar registros sin entrada (ej. ausencias)
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