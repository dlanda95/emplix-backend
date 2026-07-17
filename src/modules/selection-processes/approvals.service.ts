import { randomUUID } from 'crypto';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ApproverType  = 'APPROVER' | 'HR';

export interface SubmitApprovalDto {
  processId:    string;
  candidateId:  string;
  approverId:   string;   // user.id from JWT
  approverType: ApproverType;
  status:       ApprovalStatus;
  comment?:     string;
}

// Shape used by the frontend — one entry per expected approver
export interface ApprovalLineItem {
  approverId:   string;
  approverType: ApproverType;
  approverName: string;
  approverRole: string | null;
  order:        number | null;
  status:       ApprovalStatus;
  comment:      string | null;
  decidedAt:    Date | null;
  isCurrentUser: boolean;  // set by controller, not here
}

const HR_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST'];

export class ApprovalsService {

  // ── Resolve employee from userId ────────────────────────────────────────────
  async resolveEmployee(userId: string, db: PrismaClient) {
    return db.employee.findFirst({
      where:  { userId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  // ── Verify process exists and user is authorized ────────────────────────────
  async assertProcessAccess(
    processId: string,
    userId: string,
    role: string,
    db: PrismaClient,
  ): Promise<void> {
    const process = await (db as any).selectionProcess.findUnique({
      where:  { id: processId },
      select: { id: true, approvers: { select: { employee: { select: { userId: true } } } } },
    });
    if (!process) throw new AppError('Proceso no encontrado.', 404, 'NOT_FOUND');

    if (HR_ROLES.includes(role)) return; // HR always has access

    const isApprover = process.approvers.some((a: any) => a.employee.userId === userId);
    if (!isApprover) throw new AppError('No tienes acceso a este proceso.', 403, 'FORBIDDEN');
  }

  // ── Get all approvals for one candidate in a process ───────────────────────
  async getCandidateApprovals(processId: string, candidateId: string, currentUserId: string, db: PrismaClient) {
    const [process, candidate, existingApprovals] = await Promise.all([
      (db as any).selectionProcess.findUnique({
        where:   { id: processId },
        select:  {
          id: true,
          approvers: {
            orderBy: { order: 'asc' },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, userId: true, position: { select: { name: true } } },
              },
            },
          },
        },
      }),
      db.employee.findUnique({
        where:  { id: candidateId },
        select: {
          id: true, firstName: true, lastName: true, middleName: true, secondLastName: true,
          documentType: true, documentId: true, personalEmail: true, phone: true, cellPhone: true,
          hireDate: true, status: true, onboardingStatus: true,
          position:   { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      (db as any).candidateApproval.findMany({
        where: { selectionProcessId: processId, candidateId },
      }),
    ]);

    if (!process) throw new AppError('Proceso no encontrado.', 404, 'NOT_FOUND');
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'NOT_FOUND');

    const approvalMap = new Map<string, any>(
      existingApprovals.map((a: any) => [a.approverId, a]),
    );

    // Build line items for configured approvers
    const approverLines: ApprovalLineItem[] = process.approvers.map((spa: any) => {
      const emp = spa.employee;
      const existing = approvalMap.get(emp.userId);
      return {
        approverId:    emp.userId,
        approverType:  'APPROVER' as ApproverType,
        approverName:  `${emp.firstName} ${emp.lastName}`,
        approverRole:  emp.position?.name ?? null,
        order:         spa.order,
        status:        (existing?.status ?? 'PENDING') as ApprovalStatus,
        comment:       existing?.comment ?? null,
        decidedAt:     existing?.decidedAt ?? null,
        isCurrentUser: emp.userId === currentUserId,
      };
    });

    // HR approval line (if any HR has submitted)
    const hrApprovals = existingApprovals.filter((a: any) => a.approverType === 'HR');
    const currentUserHR = hrApprovals.find((a: any) => a.approverId === currentUserId);

    const hrLine: ApprovalLineItem | null = hrApprovals.length > 0 || HR_ROLES.includes('') ? {
      approverId:    currentUserId,
      approverType:  'HR',
      approverName:  'Recursos Humanos',
      approverRole:  null,
      order:         null,
      status:        (currentUserHR?.status ?? 'PENDING') as ApprovalStatus,
      comment:       currentUserHR?.comment ?? null,
      decidedAt:     currentUserHR?.decidedAt ?? null,
      isCurrentUser: true,
    } : null;

    // Compute overall status
    const allApproversApproved = approverLines.every(l => l.status === 'APPROVED');
    const anyRejected = approverLines.some(l => l.status === 'REJECTED') ||
      hrApprovals.some((a: any) => a.status === 'REJECTED');
    const hrApproved = hrApprovals.some((a: any) => a.status === 'APPROVED');
    const fullyApproved = allApproversApproved && hrApproved;

    return {
      candidate,
      approverLines,
      hrLine,
      hrApprovals,
      fullyApproved,
      anyRejected,
      totalApprovers:  approverLines.length,
      approvedCount:   approverLines.filter(l => l.status === 'APPROVED').length,
    };
  }

  // ── Submit or update an approval ───────────────────────────────────────────
  async submitApproval(dto: SubmitApprovalDto, db: PrismaClient) {
    // Verify process and candidate exist
    const process = await (db as any).selectionProcess.findUnique({
      where:  { id: dto.processId },
      select: { id: true, approvers: { select: { employee: { select: { userId: true } } } } },
    });
    if (!process) throw new AppError('Proceso no encontrado.', 404, 'NOT_FOUND');

    const candidate = await db.employee.findUnique({ where: { id: dto.candidateId }, select: { id: true, selectionProcessId: true } });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'NOT_FOUND');
    if (candidate.selectionProcessId !== dto.processId) {
      throw new AppError('El candidato no pertenece a este proceso.', 400, 'INVALID_CANDIDATE');
    }

    // Verify permission
    if (dto.approverType === 'APPROVER') {
      const isApprover = process.approvers.some((a: any) => a.employee.userId === dto.approverId);
      if (!isApprover) throw new AppError('No eres un aprobador de este proceso.', 403, 'FORBIDDEN');
    }

    const now = new Date();
    const existing = await (db as any).candidateApproval.findUnique({
      where: { selectionProcessId_candidateId_approverId: {
        selectionProcessId: dto.processId,
        candidateId:        dto.candidateId,
        approverId:         dto.approverId,
      }},
    });

    if (existing) {
      return (db as any).candidateApproval.update({
        where: { id: existing.id },
        data:  {
          status:    dto.status,
          comment:   dto.comment ?? null,
          decidedAt: now,
          updatedAt: now,
        },
      });
    }

    return (db as any).candidateApproval.create({
      data: {
        id:                 randomUUID(),
        selectionProcessId: dto.processId,
        candidateId:        dto.candidateId,
        approverId:         dto.approverId,
        approverType:       dto.approverType,
        status:             dto.status,
        comment:            dto.comment ?? null,
        decidedAt:          now,
      },
    });
  }

  // ── Convert candidate to active employee ───────────────────────────────────
  async convertToEmployee(processId: string, candidateId: string, db: PrismaClient) {
    const candidate = await db.employee.findUnique({
      where:  { id: candidateId },
      select: { id: true, status: true, selectionProcessId: true },
    });
    if (!candidate) throw new AppError('Candidato no encontrado.', 404, 'NOT_FOUND');
    if (candidate.selectionProcessId !== processId) {
      throw new AppError('El candidato no pertenece a este proceso.', 400, 'INVALID_CANDIDATE');
    }
    if (candidate.status !== 'SELECTED') {
      throw new AppError('Solo candidatos en estado SELECTED pueden ser activados.', 400, 'INVALID_STATUS');
    }

    // Verify fully approved
    const { fullyApproved } = await this.getCandidateApprovals(processId, candidateId, '', db);
    if (!fullyApproved) {
      throw new AppError('El candidato aún no tiene todas las aprobaciones requeridas.', 400, 'NOT_FULLY_APPROVED');
    }

    return db.employee.update({
      where: { id: candidateId },
      data:  {
        status:            'ACTIVE',
        selectionProcessId: null,  // desvincular del proceso
      },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
  }

  // ── List processes for an approver (EMPLOYEE role) ─────────────────────────
  async listMyProcesses(userId: string, db: PrismaClient) {
    const employee = await db.employee.findFirst({
      where:  { userId },
      select: { id: true },
    });
    if (!employee) return { data: [], total: 0 };

    const processes = await (db as any).selectionProcess.findMany({
      where: {
        approvers: { some: { employeeId: employee.id } },
        status:    'OPEN',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        position:   { select: { id: true, name: true } },
        approvers: {
          orderBy: { order: 'asc' },
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, userId: true, position: { select: { name: true } } } },
          },
        },
        _count: { select: { candidates: true } },
      },
    });

    return { data: processes, total: processes.length };
  }

  // ── Per-candidate approval summary for the candidates list ─────────────────
  async getApprovalSummaries(processId: string, candidateIds: string[], db: PrismaClient) {
    if (!candidateIds.length) return new Map<string, { approved: number; total: number; hrApproved: boolean; anyRejected: boolean }>();

    const [approverCount, allApprovals] = await Promise.all([
      (db as any).selectionProcessApprover.count({ where: { selectionProcessId: processId } }),
      (db as any).candidateApproval.findMany({
        where: { selectionProcessId: processId, candidateId: { in: candidateIds } },
      }),
    ]);

    const summaryMap = new Map<string, { approved: number; total: number; hrApproved: boolean; anyRejected: boolean }>();

    for (const cId of candidateIds) {
      const candidateApprovals = allApprovals.filter((a: any) => a.candidateId === cId);
      const approverApprovals  = candidateApprovals.filter((a: any) => a.approverType === 'APPROVER');
      const hrApprovals        = candidateApprovals.filter((a: any) => a.approverType === 'HR');

      summaryMap.set(cId, {
        approved:    approverApprovals.filter((a: any) => a.status === 'APPROVED').length,
        total:       approverCount,
        hrApproved:  hrApprovals.some((a: any) => a.status === 'APPROVED'),
        anyRejected: candidateApprovals.some((a: any) => a.status === 'REJECTED'),
      });
    }

    return summaryMap;
  }
}
