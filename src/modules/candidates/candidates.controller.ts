import { Request, Response, NextFunction } from 'express';
import { CandidatesService } from './candidates.service';
import { ok } from '../../shared/utils/response';

const service = new CandidatesService();

export const createCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.createCandidate(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const listCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search, onboardingStatus } = req.query as Record<string, string>;
    ok(res, await service.listCandidates(req.tenantPrisma!, { page: +page, limit: +limit, search, onboardingStatus }));
  }
  catch (e) { next(e); }
};

export const getCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getCandidate(req.params['id'], req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const updateHrData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.updateHrData(req.params['id'], req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const activateCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { corporateEmail } = req.body;
    ok(res, await service.activateCandidate(req.params['id'], corporateEmail, req.tenantPrisma!));
  }
  catch (e) { next(e); }
};
