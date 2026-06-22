import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export class LaborService {

  async getWorkShifts(db: PrismaClient) {
    return db.workShift.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async createWorkShift(data: any, db: PrismaClient) {
    const exists = await db.workShift.findUnique({ where: { name: data.name } });
    if (exists) throw new AppError('Ya existe un turno con ese nombre', 409);
    return db.workShift.create({ data });
  }

  async updateWorkShift(id: string, data: any, db: PrismaClient) {
    const shift = await db.workShift.findUnique({ where: { id } });
    if (!shift) throw new AppError('Turno no encontrado', 404);
    return db.workShift.update({ where: { id }, data });
  }

  async deleteWorkShift(id: string, db: PrismaClient) {
    const shift = await db.workShift.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!shift) throw new AppError('Turno no encontrado', 404);
    if (shift._count.employees > 0) throw new AppError('No se puede eliminar porque hay empleados asignados.', 400);
    return db.workShift.delete({ where: { id } });
  }

  async getContractTypes(db: PrismaClient) {
    return db.contractType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async createContractType(data: any, db: PrismaClient) {
    const exists = await db.contractType.findUnique({ where: { name: data.name } });
    if (exists) throw new AppError('Ya existe un tipo de contrato con ese nombre', 409);
    return db.contractType.create({ data });
  }

  async updateContractType(id: string, data: any, db: PrismaClient) {
    const contract = await db.contractType.findUnique({ where: { id } });
    if (!contract) throw new AppError('Contrato no encontrado', 404);
    return db.contractType.update({ where: { id }, data });
  }

  async deleteContractType(id: string, db: PrismaClient) {
    const contract = await db.contractType.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!contract) throw new AppError('Contrato no encontrado', 404);
    if (contract._count.employees > 0) throw new AppError('No se puede eliminar porque hay empleados con este contrato.', 400);
    return db.contractType.delete({ where: { id } });
  }
}
