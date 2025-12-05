import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware';

export class OrganizationService {

  // --- DEPARTAMENTOS ---

  async createDepartment(data: { name: string; description?: string }) {
    // Verificar duplicados
    const existing = await prisma.department.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError('Ya existe un departamento con ese nombre', 409);

    return await prisma.department.create({ data });
  }

  async getDepartments() {
    return await prisma.department.findMany({
      include: { _count: { select: { employees: true } } }, // Incluimos conteo de empleados
      orderBy: { name: 'asc' }
    });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string }) {
    return await prisma.department.update({
      where: { id },
      data
    });
  }

  async deleteDepartment(id: string) {
    // Verificar si tiene empleados asignados antes de borrar
    const dep = await prisma.department.findUnique({ 
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (dep && dep._count.employees > 0) {
      throw new AppError('No se puede eliminar el departamento porque tiene empleados asignados', 400);
    }

    return await prisma.department.delete({ where: { id } });
  }

  // --- CARGOS (POSITIONS) ---

  async createPosition(data: { name: string; description?: string }) {
    const existing = await prisma.position.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError('Ya existe un cargo con ese nombre', 409);

    return await prisma.position.create({ data });
  }

  async getPositions() {
    return await prisma.position.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' }
    });
  }

  async updatePosition(id: string, data: { name?: string; description?: string }) {
    return await prisma.position.update({ where: { id }, data });
  }

  async deletePosition(id: string) {
    const pos = await prisma.position.findUnique({ 
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (pos && pos._count.employees > 0) {
      throw new AppError('No se puede eliminar el cargo porque tiene empleados asignados', 400);
    }

    return await prisma.position.delete({ where: { id } });
  }
}