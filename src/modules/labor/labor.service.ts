import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/middlewares/error.middleware';

export class LaborService {

  // ==========================================
  // 1. GESTIÓN DE TURNOS (WORK SHIFTS)
  // ==========================================
  
  async getWorkShifts(tenantId: string) {
    return await prisma.workShift.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } } // Para saber cuántos lo usan
      }
    });
  }

  async createWorkShift(data: any, tenantId: string) {
    // Validar nombre único
    const exists = await prisma.workShift.findFirst({
      where: { name: data.name, tenantId }
    });
    if (exists) throw new AppError('Ya existe un turno con ese nombre', 409);

    return await prisma.workShift.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async updateWorkShift(id: string, data: any, tenantId: string) {
    const shift = await prisma.workShift.findUnique({ where: { id } });
    if (!shift || shift.tenantId !== tenantId) throw new AppError('Turno no encontrado', 404);

    return await prisma.workShift.update({
      where: { id },
      data
    });
  }

  async deleteWorkShift(id: string, tenantId: string) {
    const shift = await prisma.workShift.findUnique({ 
      where: { id },
      include: { _count: { select: { employees: true } } } 
    });
    
    if (!shift || shift.tenantId !== tenantId) throw new AppError('Turno no encontrado', 404);
    
    // @ts-ignore (Prisma count typed correctly in runtime)
    if (shift._count.employees > 0) {
      throw new AppError('No se puede eliminar porque hay empleados asignados a este turno.', 400);
    }

    return await prisma.workShift.delete({ where: { id } });
  }

  // ==========================================
  // 2. GESTIÓN DE CONTRATOS (CONTRACT TYPES)
  // ==========================================

  async getContractTypes(tenantId: string) {
    return await prisma.contractType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } }
      }
    });
  }

  async createContractType(data: any, tenantId: string) {
    const exists = await prisma.contractType.findUnique({
      where: { name_tenantId: { name: data.name, tenantId } }
    });
    if (exists) throw new AppError('Ya existe un tipo de contrato con ese nombre', 409);

    return await prisma.contractType.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async updateContractType(id: string, data: any, tenantId: string) {
    const contract = await prisma.contractType.findUnique({ where: { id } });
    if (!contract || contract.tenantId !== tenantId) throw new AppError('Contrato no encontrado', 404);

    return await prisma.contractType.update({
      where: { id },
      data
    });
  }

  async deleteContractType(id: string, tenantId: string) {
    const contract = await prisma.contractType.findUnique({ 
      where: { id },
      include: { _count: { select: { employees: true } } }
    });

    if (!contract || contract.tenantId !== tenantId) throw new AppError('Contrato no encontrado', 404);

    // @ts-ignore
    if (contract._count.employees > 0) {
      throw new AppError('No se puede eliminar porque hay empleados con este tipo de contrato.', 400);
    }

    return await prisma.contractType.delete({ where: { id } });
  }
}