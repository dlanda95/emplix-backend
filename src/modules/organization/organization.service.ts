import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export class OrganizationService {

  async getDepartments(db: PrismaClient) {
    return db.department.findMany({
      include: {
        _count: { select: { employees: true, positions: true } },
        positions: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(data: { name: string; description?: string; code?: string | null }, db: PrismaClient) {
    const existingName = await db.department.findUnique({ where: { name: data.name } });
    if (existingName) throw new AppError('Ya existe un departamento con ese nombre en esta empresa', 409);

    if (data.code) {
      const existingCode = await db.department.findUnique({ where: { code: data.code } });
      if (existingCode) throw new AppError('Ya existe un departamento con ese código', 409);
    }

    return db.department.create({ data });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; code?: string }, db: PrismaClient) {
    const dep = await db.department.findUnique({ where: { id } });
    if (!dep) throw new AppError('Departamento no encontrado', 404);
    return db.department.update({ where: { id }, data });
  }

  async deleteDepartment(id: string, db: PrismaClient) {
    const dep = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, positions: true } } },
    });

    if (!dep) throw new AppError('Departamento no encontrado', 404);
    if (dep._count.employees > 0) throw new AppError('No se puede eliminar: hay empleados asignados.', 400);
    if (dep._count.positions > 0) throw new AppError('No se puede eliminar: hay cargos definidos aquí.', 400);

    return db.department.delete({ where: { id } });
  }

  async getPositions(db: PrismaClient, departmentId?: string) {
    return db.position.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: {
        _count: { select: { employees: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createPosition(data: { name: string; description?: string; departmentId: string }, db: PrismaClient) {
    const existing = await db.position.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(`El cargo '${data.name}' ya existe en esta empresa`, 409);

    if (data.departmentId) {
      const dep = await db.department.findUnique({ where: { id: data.departmentId } });
      if (!dep) throw new AppError('El departamento indicado no existe', 404);
    }

    return db.position.create({ data });
  }

  async updatePosition(id: string, data: { name?: string; description?: string; departmentId?: string }, db: PrismaClient) {
    const pos = await db.position.findUnique({ where: { id } });
    if (!pos) throw new AppError('Cargo no encontrado', 404);
    return db.position.update({ where: { id }, data });
  }

  async deletePosition(id: string, db: PrismaClient) {
    const pos = await db.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!pos) throw new AppError('Cargo no encontrado', 404);
    if (pos._count.employees > 0) throw new AppError('No se puede eliminar: hay empleados ocupándolo.', 400);

    return db.position.delete({ where: { id } });
  }
}
