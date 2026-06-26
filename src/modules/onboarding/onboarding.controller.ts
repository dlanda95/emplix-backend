import { Request, Response, NextFunction } from 'express';
import { OnboardingService } from './onboarding.service';

const service = new OnboardingService();
const ok = (res: Response, data: unknown) => res.json({ success: true, data });

export const getOnboardingProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getProfile(req.user!.id, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const saveOnboardingData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.saveData(req.user!.id, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const submitOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.submit(req.user!.id, req.tenantPrisma!)); }
  catch (e) { next(e); }
};
