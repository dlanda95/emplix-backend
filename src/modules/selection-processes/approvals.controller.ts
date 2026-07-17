import { Request, Response, NextFunction } from 'express';
import { ApprovalsService, ApproverType } from './approvals.service';
import { ok } from '../../shared/utils/response';

const HR_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST'];

const svc = new ApprovalsService();

export const getCandidateApprovals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: processId, candidateId } = req.params;
    await svc.assertProcessAccess(processId, req.user!.id, req.user!.role, req.tenantPrisma!);
    const data = await svc.getCandidateApprovals(processId, candidateId, req.user!.id, req.tenantPrisma!);
    ok(res, data);
  } catch (e) { next(e); }
};

export const submitApproval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: processId, candidateId } = req.params;
    const { status, comment } = req.body as { status: string; comment?: string };

    const approverType: ApproverType = HR_ROLES.includes(req.user!.role) ? 'HR' : 'APPROVER';

    const result = await svc.submitApproval(
      { processId, candidateId, approverId: req.user!.id, approverType, status: status as any, comment },
      req.tenantPrisma!,
    );
    ok(res, result);
  } catch (e) { next(e); }
};

export const convertToEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: processId, candidateId } = req.params;
    const result = await svc.convertToEmployee(processId, candidateId, req.tenantPrisma!);
    ok(res, result);
  } catch (e) { next(e); }
};

export const listMyProcesses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await svc.listMyProcesses(req.user!.id, req.tenantPrisma!);
    ok(res, data);
  } catch (e) { next(e); }
};
