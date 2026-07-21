import { randomUUID } from 'crypto';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export interface CreateSelectionProcessDto {
  description?: string;
  departmentId: string;
  positionId:   string;
  approverIds:  string[];
  createdById?: string;
}

export interface UpdateSelectionProcessDto {
  description?:  string | null;
  status?:       'OPEN' | 'CLOSED' | 'CANCELLED';
  departmentId?: string;
  positionId?:   string;
  approverIds?:  string[];
}

export interface ListSelectionProcessesParams {
  page?:   number;
  limit?:  number;
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED';
  search?: string;
}

// Include común para queries de proceso
const PROCESS_INCLUDE = {
  department: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
  position:   { select: { id: true, name: true } },
  approvers:  {
    orderBy: { order: 'asc' as const },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, userId: true, position: { select: { name: true } } },
      },
    },
  },
  _count: { select: { candidates: true } },
};

export class SelectionProcessesService {

  private async generateProcessCode(db: PrismaClient): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearPrefix  = `PS-${currentYear}-`;

    const lastProcess = await (db as any).selectionProcess.findFirst({
      where:   { code: { startsWith: yearPrefix } },
      orderBy: { code: 'desc' },
      select:  { code: true },
    });

    const nextCorrelative = lastProcess
      ? parseInt((lastProcess.code as string).split('-')[2], 10) + 1
      : 1;

    return `${yearPrefix}${String(nextCorrelative).padStart(6, '0')}`;
  }

  async createSelectionProcess(dto: CreateSelectionProcessDto, db: PrismaClient) {
    // El nombre del proceso se deriva automáticamente del puesto
    const position = await db.position.findUnique({ where: { id: dto.positionId }, select: { name: true } });
    if (!position) throw new AppError('El puesto seleccionado no existe.', 400, 'INVALID_POSITION');

    const code = await this.generateProcessCode(db);

    const createProcess = async (tx: any, processCode: string) => {
      const process = await tx.selectionProcess.create({
        data: {
          code:         processCode,
          name:         position.name,
          description:  dto.description ?? null,
          departmentId: dto.departmentId,
          positionId:   dto.positionId,
          createdById:  dto.createdById ?? null,
          status:       'OPEN',
        },
      });

      await Promise.all(
        dto.approverIds.map((employeeId, index) =>
          tx.selectionProcessApprover.create({
            data: { id: randomUUID(), selectionProcessId: process.id, employeeId, order: index + 1 },
          }),
        ),
      );

      return tx.selectionProcess.findUnique({
        where:   { id: process.id },
        include: PROCESS_INCLUDE,
      });
    };

    try {
      return await (db as any).$transaction((tx: any) => createProcess(tx, code));
    } catch (err: any) {
      // Reintentar si hay colisión de código
      if (err?.code === 'P2002' && err?.meta?.target?.includes('code')) {
        const retryCode = await this.generateProcessCode(db);
        return (db as any).$transaction((tx: any) => createProcess(tx, retryCode));
      }
      throw err;
    }
  }

  async listSelectionProcesses(db: PrismaClient, params: ListSelectionProcessesParams = {}) {
    const page  = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await (db as any).$transaction([
      (db as any).selectionProcess.count({ where }),
      (db as any).selectionProcess.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: PROCESS_INCLUDE,
      }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getSelectionProcess(processId: string, db: PrismaClient) {
    const process = await (db as any).selectionProcess.findUnique({
      where:   { id: processId },
      include: PROCESS_INCLUDE,
    });
    if (!process) throw new AppError('Proceso de selección no encontrado.', 404, 'SELECTION_PROCESS_NOT_FOUND');
    return process;
  }

  async getSelectionProcessByCode(code: string, db: PrismaClient) {
    const process = await (db as any).selectionProcess.findFirst({
      where:   { code },
      include: PROCESS_INCLUDE,
    });
    if (!process) throw new AppError('Proceso de selección no encontrado.', 404, 'SELECTION_PROCESS_NOT_FOUND');
    return process;
  }

  async getSelectionProcessCandidates(
    processId: string,
    db:        PrismaClient,
    params:    { page?: number; limit?: number; search?: string; onboardingStatus?: string } = {},
  ) {
    const process = await (db as any).selectionProcess.findUnique({ where: { id: processId }, select: { id: true } });
    if (!process) throw new AppError('Proceso de selección no encontrado.', 404, 'SELECTION_PROCESS_NOT_FOUND');

    const page  = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const skip  = (page - 1) * limit;

    const where: any = { selectionProcessId: processId };
    if (params.onboardingStatus) where.onboardingStatus = params.onboardingStatus;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { firstName:  { contains: q, mode: 'insensitive' } },
        { lastName:   { contains: q, mode: 'insensitive' } },
        { documentId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const include = {
      position:   { select: { name: true } },
      department: { select: { name: true } },
      user:       { select: { email: true, isActive: true } },
    };

    const [total, data] = await db.$transaction([
      db.employee.count({ where }),
      db.employee.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateSelectionProcess(processId: string, dto: UpdateSelectionProcessDto, db: PrismaClient) {
    const existing = await (db as any).selectionProcess.findUnique({ where: { id: processId } });
    if (!existing) throw new AppError('Proceso de selección no encontrado.', 404, 'SELECTION_PROCESS_NOT_FOUND');

    return (db as any).$transaction(async (tx: any) => {
      const updateData: any = {};
      if (dto.description  !== undefined) updateData.description  = dto.description;
      if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
      if (dto.positionId   !== undefined) updateData.positionId   = dto.positionId;
      if (dto.status       !== undefined) {
        updateData.status   = dto.status;
        updateData.closedAt = dto.status !== 'OPEN' ? new Date() : null;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.selectionProcess.update({ where: { id: processId }, data: updateData });
      }

      if (dto.approverIds !== undefined) {
        await tx.selectionProcessApprover.deleteMany({ where: { selectionProcessId: processId } });
        await Promise.all(
          dto.approverIds.map((employeeId, index) =>
            tx.selectionProcessApprover.create({
              data: { id: randomUUID(), selectionProcessId: processId, employeeId, order: index + 1 },
            }),
          ),
        );
      }

      return tx.selectionProcess.findUnique({ where: { id: processId }, include: PROCESS_INCLUDE });
    });
  }
}
