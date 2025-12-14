import { prisma } from '../../config/prisma';

export class AttendanceService {

  // Obtener estado de hoy (¿Ya marcó? ¿Sigue trabajando?)
  async getTodayStatus(userId: string) {
    const today = new Date();
    
    // Buscar el empleado asociado al usuario
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error('Empleado no encontrado');

    const record = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: today // Prisma compara automáticamente solo la parte de fecha si el campo es @db.Date
      }
    });

    return {
      status: record ? (record.checkOut ? 'COMPLETED' : 'WORKING') : 'NOT_STARTED',
      record
    };
  }

  // Marcar Entrada (Clock In)
  async clockIn(userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error('Empleado no encontrado');

    const today = new Date();

    // Validar si ya existe registro hoy
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: today }
    });

    if (existing) throw new Error('Ya has marcado tu entrada hoy.');

    return await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        checkIn: new Date() // Hora actual exacta
      }
    });
  }

  // Marcar Salida (Clock Out)
  async clockOut(userId: string) {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error('Empleado no encontrado');

    const today = new Date();

    const record = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, date: today }
    });

    if (!record) throw new Error('No has marcado entrada hoy.');
    if (record.checkOut) throw new Error('Ya has marcado tu salida hoy.');

    return await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: new Date() }
    });
  }



  // NUEVO: Reporte Diario para Admin
  async getDailyReport(date: Date) {
    // 1. Definir rango de fecha (Inicio y Fin del día)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Obtener TODOS los empleados activos
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
        department: { select: { name: true } }
      },
      orderBy: { lastName: 'asc' }
    });

    // 3. Obtener registros de asistencia de ese día
    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 4. Cruzar información (Merge)
    return employees.map(emp => {
      const log = attendanceLogs.find(a => a.employeeId === emp.id);
      
      // Lógica simple de estado (Se puede mejorar con horarios reales después)
      let status = 'AUSENTE';
      if (log) {
        // Ejemplo: Si llegó después de las 9:15 AM es TARDE (Hardcoded por ahora)
        const checkInTime = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
        const limitTime = 9 * 60 + 15; // 09:15 AM
        
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



  // Obtener historial personal (Rango de fechas)
  async getMyAttendanceHistory(userId: string, from: Date, to: Date) {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error('Empleado no encontrado');

    const logs = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: from,
          lte: to
        }
      },
      orderBy: { date: 'desc' } // Lo más reciente primero
    });

    // Enriquecer datos (Cálculo de horas, estado)
    return logs.map(log => {
      let status = 'PUNTUAL';
      let hoursWorked = 0;

      // Lógica simple de estado (Ejemplo: Tarde si llega después de las 9:15)
      const limitTime = 9 * 60 + 15; 
      const checkInMinutes = log.checkIn.getHours() * 60 + log.checkIn.getMinutes();
      
      if (checkInMinutes > limitTime) status = 'TARDE';

      // Cálculo de horas trabajadas
      if (log.checkOut) {
        const diffMs = log.checkOut.getTime() - log.checkIn.getTime();
        hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // 2 decimales
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