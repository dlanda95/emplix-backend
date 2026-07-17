import { Request, Response, NextFunction } from 'express';
import { SelectionProcessesService } from './selection-processes.service';
import { ApprovalsService } from './approvals.service';
import { ok, created } from '../../shared/utils/response';

const service    = new SelectionProcessesService();
const approvalsSvc = new ApprovalsService();

export const createSelectionProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.createSelectionProcess({ ...req.body, createdById: req.user?.id }, req.tenantPrisma!);
    created(res, result);
  } catch (e) { next(e); }
};

export const listSelectionProcesses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status, search } = req.query as Record<string, string>;
    ok(res, await service.listSelectionProcesses(req.tenantPrisma!, { page: +page, limit: +limit, status: status as any, search }));
  } catch (e) { next(e); }
};

export const getSelectionProcessByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const process = await service.getSelectionProcessByCode(req.params['code'], req.tenantPrisma!);
    await approvalsSvc.assertProcessAccess(process.id, req.user!.id, req.user!.role, req.tenantPrisma!);
    ok(res, process);
  } catch (e) { next(e); }
};

export const getSelectionProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await approvalsSvc.assertProcessAccess(req.params['id'], req.user!.id, req.user!.role, req.tenantPrisma!);
    ok(res, await service.getSelectionProcess(req.params['id'], req.tenantPrisma!));
  } catch (e) { next(e); }
};

export const getSelectionProcessCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await approvalsSvc.assertProcessAccess(req.params['id'], req.user!.id, req.user!.role, req.tenantPrisma!);
    const { page, limit, search, onboardingStatus } = req.query as Record<string, string>;
    ok(res, await service.getSelectionProcessCandidates(
      req.params['id'], req.tenantPrisma!,
      { page: +page, limit: +limit, search, onboardingStatus },
    ));
  } catch (e) { next(e); }
};

export const updateSelectionProcess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    ok(res, await service.updateSelectionProcess(req.params['id'], req.body, req.tenantPrisma!));
  } catch (e) { next(e); }
};
