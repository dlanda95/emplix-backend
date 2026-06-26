import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface WorkShiftDto {
  name:           string;
  startTime?:     string;
  endTime?:       string;
  breakTime?:     number;
  tolerance?:     number;
  allowsOvertime?: boolean;
  isFiscalized?:  boolean;
}

export interface ContractTypeDto {
  name:         string;
  code?:        string;
  hasBenefits?: boolean;
  isLaboral?:   boolean;
}

export class LaborService {

  // ── Turnos ────────────────────────────────────────────────────────────────

  async getWorkShifts(db: PrismaClient) {
    return db.workShift.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async createWorkShift(data: WorkShiftDto, db: PrismaClient) {
    const exists = await db.workShift.findUnique({ where: { name: data.name } });
    if (exists) throw new AppError('Ya existe un turno con ese nombre.', 409, 'DUPLICATE_SHIFT');

    return db.workShift.create({ data });
  }

  async updateWorkShift(id: string, data: Partial<WorkShiftDto>, db: PrismaClient) {
    const shift = await db.workShift.findUnique({ where: { id } });
    if (!shift) throw new AppError('Turno no encontrado.', 404, 'SHIFT_NOT_FOUND');

    return db.workShift.update({ where: { id }, data });
  }

  async deleteWorkShift(id: string, db: PrismaClient) {
    const shift = await db.workShift.findUnique({
      where:   { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!shift) throw new AppError('Turno no encontrado.', 404, 'SHIFT_NOT_FOUND');
    if (shift._count.employees > 0) {
      throw new AppError(
        'No se puede eliminar este turno porque tiene empleados asignados.',
        400,
        'SHIFT_IN_USE',
      );
    }

    return db.workShift.delete({ where: { id } });
  }

  // ── Tipos de contrato ─────────────────────────────────────────────────────

  async getContractTypes(db: PrismaClient) {
    return db.contractType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }

  async createContractType(data: ContractTypeDto, db: PrismaClient) {
    const exists = await db.contractType.findUnique({ where: { name: data.name } });
    if (exists) throw new AppError('Ya existe un tipo de contrato con ese nombre.', 409, 'DUPLICATE_CONTRACT_TYPE');

    return db.contractType.create({ data });
  }

  async updateContractType(id: string, data: Partial<ContractTypeDto>, db: PrismaClient) {
    const contract = await db.contractType.findUnique({ where: { id } });
    if (!contract) throw new AppError('Tipo de contrato no encontrado.', 404, 'CONTRACT_TYPE_NOT_FOUND');

    return db.contractType.update({ where: { id }, data });
  }

  async deleteContractType(id: string, db: PrismaClient) {
    const contract = await db.contractType.findUnique({
      where:   { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!contract) throw new AppError('Tipo de contrato no encontrado.', 404, 'CONTRACT_TYPE_NOT_FOUND');
    if (contract._count.employees > 0) {
      throw new AppError(
        'No se puede eliminar este tipo de contrato porque tiene empleados asignados.',
        400,
        'CONTRACT_TYPE_IN_USE',
      );
    }

    return db.contractType.delete({ where: { id } });
  }
}
