import { Request, Response, NextFunction } from 'express';
import { HRAnalysisService } from './hr-analysis.service';
import { AppError } from '../../shared/middlewares/error.middleware';
import { ok, created } from '../../shared/utils/response';

const service = new HRAnalysisService();

export const getHRAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    ok(res, await service.getAnalysis(req.params['id'], req.params['candidateId'], req.tenantPrisma!));
  } catch (e) { next(e); }
};

export const upsertHRAnalysis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    ok(res, await service.upsertAnalysis(
      req.params['id'], req.params['candidateId'], req.body, req.user!.id, req.tenantPrisma!,
    ));
  } catch (e) { next(e); }
};

export const uploadHRAnalysisDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) throw new AppError('No se adjuntó ningún archivo.', 400, 'NO_FILE');
    created(res, await service.uploadDocument(
      req.params['id'], req.params['candidateId'], req.file,
      req.tenant!.slug, req.user!.id, req.tenantPrisma!,
    ));
  } catch (e) { next(e); }
};

export const deleteHRAnalysisDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteDocument(req.params['docId'], req.tenantPrisma!);
    ok(res, { ok: true });
  } catch (e) { next(e); }
};

export const getHRAnalysisDocumentUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const url = await service.getDocumentUrl(req.params['docId'], req.tenantPrisma!);
    ok(res, { url });
  } catch (e) { next(e); }
};

export const getProcessHRAnalyses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    ok(res, await service.getAnalysesForProcess(req.params['id'], req.tenantPrisma!));
  } catch (e) { next(e); }
};
