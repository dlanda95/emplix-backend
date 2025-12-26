import { prisma } from '../../config/prisma';
import { EmployeeStatus } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware';

export class EmployeesService {

  // 1. Obtener Directorio Completo (Solo de MI empresa)
  async getAllEmployees(tenantId: string) {
    return await prisma.employee.findMany({
      where: { 
        tenantId: tenantId, // <--- CRÍTICO: Filtro de seguridad
        status: 'ACTIVE' 
      }, 
      include: {
        department: { select: { id: true, name: true, code: true } }, 
        position: { select: { id: true, name: true } },
        supervisor: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true 
          } 
        },
        user: { select: { email: true, role: true, isActive: true } }
      },
      orderBy: { lastName: 'asc' }
    });
  }

  // 2. Asignar Datos Administrativos (Validando Tenant)
  async assignAdministrativeData(employeeId: string, data: any, tenantId: string) {
    const { departmentId, positionId, supervisorId, contractType } = data;

    // A. Validar que el empleado exista en ESTA empresa
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new AppError('Empleado no encontrado en esta organización', 404);
    }

    // B. Validación extra: Un empleado no puede ser su propio jefe
    if (supervisorId && supervisorId === employeeId) {
      throw new AppError('Un colaborador no puede ser su propio supervisor', 400);
    }

    // C. (Opcional) Aquí podrías validar que el supervisorId también pertenezca al tenantId
    // para evitar que alguien asigne un jefe de otra empresa por error.

    return await prisma.employee.update({
      where: { id: employeeId },
      data: {
        departmentId: departmentId || null,
        positionId: positionId || null,
        supervisorId: supervisorId || null,
        contractType: contractType // Agregamos esto si viene del form
      },
      include: {
        department: true,
        position: true,
        supervisor: true
      }
    });
  }

  // 3. Obtener el entorno de equipo 360° (Org Chart)
  async getMyTeamContext(userId: string, tenantId: string) {
    
    // A. Encontrar al empleado actual (Validando tenant)
    const me = await prisma.employee.findFirst({
      where: { userId, tenantId }, // <--- Filtro doble
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

    if (!me) throw new AppError('Perfil de empleado no encontrado', 404);

    // B. Buscar Pares (Mismo supervisor, excluyéndome a mí, misma empresa)
    let peers: any[] = [];
    if (me.supervisorId) {
      peers = await prisma.employee.findMany({
        where: {
          supervisorId: me.supervisorId,
          id: { not: me.id },
          tenantId: tenantId, // <--- Seguridad
          status: 'ACTIVE'
        },
        include: { position: true, user: { select: { email: true } } }
      });
    }

    // C. Buscar Subordinados (Gente que me reporta a mí)
    const subordinates = await prisma.employee.findMany({
      where: {
        supervisorId: me.id,
        tenantId: tenantId, // <--- Seguridad
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

  // 4. Buscador de Empleados (Para el Controller que lo pide)
  async searchEmployees(query: string, tenantId: string) {
    return await prisma.employee.findMany({
      where: {
        tenantId: tenantId, // <--- Solo buscar en mi empresa
        status: EmployeeStatus.ACTIVE,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
        department: { select: { name: true } },
        // photoUrl: true // Si tuvieras foto
      }
    });
  }
}