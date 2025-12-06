import { prisma } from '../../config/prisma';

export class EmployeesService {

  // Obtener Directorio Completo
  async getAllEmployees() {
    return await prisma.employee.findMany({
      where: { status: 'ACTIVE' }, // Solo activos
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        supervisor: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        user: { select: { email: true, role: true } } // Para ver roles
      },
      orderBy: { lastName: 'asc' }
    });
  }

  // Asignar Datos Administrativos (Jefe, Cargo, Dpto)
  async assignAdministrativeData(employeeId: string, data: any) {
    const { departmentId, positionId, supervisorId } = data;

    return await prisma.employee.update({
      where: { id: employeeId },
      data: {
        departmentId: departmentId || null,
        positionId: positionId || null,
        supervisorId: supervisorId || null
      },
      include: {
        department: true,
        position: true,
        supervisor: true
      }
    });
  }
}