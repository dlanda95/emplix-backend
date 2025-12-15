import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware'; // Asegúrate de tener esto

export class EmployeesService {

  // Obtener Directorio Completo
  async getAllEmployees() {
    return await prisma.employee.findMany({
      where: { status: 'ACTIVE' }, // Solo activos
      include: {
       department: { select: { id: true, name: true, code: true } }, // Agregué 'code'
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
    // Validación extra: Un empleado no puede ser su propio jefe
    if (supervisorId && supervisorId === employeeId) {
      throw new AppError('Un colaborador no puede ser su propio supervisor', 400);
    }

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



  // Obtener el entorno de equipo del usuario (360°)
  async getMyTeamContext(userId: string) {
    // 1. Encontrar al empleado actual
    const me = await prisma.employee.findUnique({
      where: { userId },
      include: { 
        supervisor: { // Traer datos del Jefe
          include: { 
            position: true, 
            user: { select: { email: true } } 
          }
        },
        position: true
      }
    });

    if (!me) throw new Error('Empleado no encontrado');

    // 2. Buscar Pares (Mismo supervisor, excluyéndome a mí)
    let peers: any[] = [];
    if (me.supervisorId) {
      peers = await prisma.employee.findMany({
        where: {
          supervisorId: me.supervisorId,
          id: { not: me.id }, // No incluirme
          status: 'ACTIVE'
        },
        include: { position: true, user: { select: { email: true } } }
      });
    }

    // 3. Buscar Subordinados (Gente que me reporta a mí)
    const subordinates = await prisma.employee.findMany({
      where: {
        supervisorId: me.id,
        status: 'ACTIVE'
      },
      include: { position: true, user: { select: { email: true } } }
    });

    return {
      me,
      supervisor: me.supervisor,
      peers,
      subordinates
    };
  }
}