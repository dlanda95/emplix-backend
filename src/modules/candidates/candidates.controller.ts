import { Request, Response, NextFunction } from 'express';
import { CandidatesService } from './candidates.service';

const service = new CandidatesService();
const ok = (res: Response, data: unknown) => res.json({ success: true, data });

export const createCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.createCandidate(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const listCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.listCandidates(req.tenantPrisma!)); }
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
