import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware';

export class OrganizationService {

  // ==========================================
  // DEPARTAMENTOS
  // ==========================================

// AHORA RECIBE tenantId
  async createDepartment(data: { name: string; description?: string; code?: string }, tenantId: string) {
    
    // 1. Verificar duplicados por Nombre + Tenant
    const existingName = await prisma.department.findUnique({
      where: {
        name_tenantId: {
          name: data.name,
          tenantId: tenantId
        }
      }
    });
    if (existingName) throw new AppError('Ya existe un departamento con ese nombre en esta empresa', 409);

    // 2. Verificar duplicados por Código + Tenant
    if (data.code) {
      const existingCode = await prisma.department.findUnique({
        where: {
          code_tenantId: {
            code: data.code,
            tenantId: tenantId
          }
        }
      });
      if (existingCode) throw new AppError('Ya existe un departamento con ese código', 409);
    }

    // 3. Crear inyectando tenantId
    return await prisma.department.create({
      data: {
        ...data,
        tenantId: tenantId // <--- OBLIGATORIO
      }
    });
  }

// AHORA RECIBE tenantId
  async getDepartments(tenantId: string) {
    return await prisma.department.findMany({
      where: {
        tenantId: tenantId // <--- FILTRAR POR EMPRESA
      },
      include: { 
        _count: { 
          select: { 
            employees: true, 
            positions: true
          } 
        },
        positions: true 
      }, 
      orderBy: { name: 'asc' }
    });
  }



 async updateDepartment(id: string, data: { name?: string; description?: string; code?: string }) {
    // El ID es único globalmente (UUID), así que where: { id } sigue funcionando.
    // Opcionalmente podrías verificar que pertenezca al tenant antes de actualizar.
    return await prisma.department.update({
      where: { id },
      data
    });
  }

  async deleteDepartment(id: string) {
    const dep = await prisma.department.findUnique({ 
      where: { id },
      include: { 
        _count: { 
          select: { employees: true, positions: true } 
        } 
      }
    });

    if (!dep) throw new AppError('Departamento no encontrado', 404);

    if (dep._count.employees > 0) {
      throw new AppError('No se puede eliminar: Hay empleados asignados.', 400);
    }

    if (dep._count.positions > 0) {
      throw new AppError('No se puede eliminar: Hay cargos definidos aquí.', 400);
    }

    return await prisma.department.delete({ where: { id } });
  }

  // ==========================================
  // CARGOS (POSITIONS)
  // ==========================================

  // AHORA RECIBE tenantId
  async createPosition(data: { name: string; description?: string; departmentId: string }, tenantId: string) {
    
    // 1. Validar nombre duplicado (Dependiendo de si tu Position tiene @@unique([name, tenantId]))
    // Si no tienes ese unique constraint en schema.prisma para Position, usa findFirst en lugar de findUnique.
    // Asumiendo que QUIERES que sea único por empresa:
    const existing = await prisma.position.findFirst({ 
      where: { 
        name: data.name,
        tenantId: tenantId 
      } 
    });
    
    if (existing) throw new AppError(`El cargo '${data.name}' ya existe en esta empresa`, 409);

    // 2. Validar que el Departamento exista Y pertenezca a la empresa
    if (data.departmentId) {
      const depExists = await prisma.department.findUnique({ 
        where: { id: data.departmentId } 
      });
      
      if (!depExists || depExists.tenantId !== tenantId) {
        throw new AppError('El departamento indicado no existe o no pertenece a tu empresa', 404);
      }
    }

    // 3. Crear inyectando tenantId
    return await prisma.position.create({ 
      data: {
        name: data.name,
        description: data.description,
        departmentId: data.departmentId,
        tenantId: tenantId // <--- OBLIGATORIO
      }
    });
  }

// AHORA RECIBE tenantId
  async getPositions(tenantId: string, departmentId?: string) {
    // Filtro base: Solo de esta empresa
    const whereClause: any = { tenantId };

    // Si pidieron filtrar por departamento, agregamos
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    return await prisma.position.findMany({
      where: whereClause,
      include: { 
        _count: { select: { employees: true } },
        department: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

 async updatePosition(id: string, data: { name?: string; description?: string; departmentId?: string }) {
    return await prisma.position.update({ where: { id }, data });
  }

 async deletePosition(id: string) {
    const pos = await prisma.position.findUnique({ 
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (!pos) throw new AppError('Cargo no encontrado', 404);

    if (pos._count.employees > 0) {
      throw new AppError('No se puede eliminar: Hay empleados ocupándolo.', 400);
    }

    return await prisma.position.delete({ where: { id } });
  }
}