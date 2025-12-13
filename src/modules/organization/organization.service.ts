import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware';

export class OrganizationService {

  // ==========================================
  // DEPARTAMENTOS
  // ==========================================

  async createDepartment(data: { name: string; description?: string; code?: string }) {
    // 1. Verificar duplicados por Nombre
    const existingName = await prisma.department.findUnique({ where: { name: data.name } });
    if (existingName) throw new AppError('Ya existe un departamento con ese nombre', 409);

    // 2. Verificar duplicados por Código (Si lo envías)
    if (data.code) {
      const existingCode = await prisma.department.findUnique({ where: { code: data.code } });
      if (existingCode) throw new AppError('Ya existe un departamento con ese código', 409);
    }

    return await prisma.department.create({ data });
  }

  async getDepartments() {
    return await prisma.department.findMany({
      include: { 
        _count: { 
          select: { 
            employees: true, 
            positions: true // <--- MEJORA: También cuenta cuántos cargos tiene el área
          } 
        },
        positions: true 
      }, 
      orderBy: { name: 'asc' }
    });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; code?: string }) {
    // Validar si el ID existe antes de actualizar (Opcional, Prisma lo maneja, pero es más limpio)
    return await prisma.department.update({
      where: { id },
      data
    });
  }

  async deleteDepartment(id: string) {
    // Verificar dependencias antes de borrar
    const dep = await prisma.department.findUnique({ 
      where: { id },
      include: { 
        _count: { 
          select: { 
            employees: true, 
            positions: true // <--- MEJORA: Validar cargos también
          } 
        } 
      }
    });

    if (!dep) throw new AppError('Departamento no encontrado', 404);

    if (dep._count.employees > 0) {
      throw new AppError('No se puede eliminar: Hay empleados asignados a este departamento.', 400);
    }

    if (dep._count.positions > 0) { // <--- MEJORA CRÍTICA
      throw new AppError('No se puede eliminar: Hay cargos (puestos) definidos en este departamento. Elimínalos o muévelos antes.', 400);
    }

    return await prisma.department.delete({ where: { id } });
  }

  // ==========================================
  // CARGOS (POSITIONS)
  // ==========================================

  async createPosition(data: { name: string; description?: string; departmentId: string }) {
    // 1. Validar nombre duplicado (OJO: Esto asume que el nombre es único globalmente según tu Schema)
    const existing = await prisma.position.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(`El cargo '${data.name}' ya existe en el sistema`, 409);

    // 2. Validar que el Departamento exista <--- MEJORA
    if (data.departmentId) {
      const depExists = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!depExists) throw new AppError('El departamento indicado no existe', 404);
    }

    return await prisma.position.create({ 
      data: {
        name: data.name,
        description: data.description,
        departmentId: data.departmentId
      }
    });
  }

  async getPositions(departmentId?: string) {
    const whereClause = departmentId ? { departmentId } : {};

    return await prisma.position.findMany({
      where: whereClause,
      include: { 
        _count: { select: { employees: true } },
        department: { select: { id: true, name: true } } // <--- MEJORA: Traemos nombre del depto
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
      throw new AppError('No se puede eliminar el cargo porque hay empleados ocupándolo actualmente.', 400);
    }

    return await prisma.position.delete({ where: { id } });
  }
}