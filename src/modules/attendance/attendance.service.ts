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
}