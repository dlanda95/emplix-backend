import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../../../shared/middlewares/auth.middleware';
import { ok } from '../../../shared/utils/response';
import { AuthMethodsService } from './auth-methods.service';

const router  = Router();
const service = new AuthMethodsService();
const ADMIN   = requireRole(['COMPANY_ADMIN']);

router.use(authMiddleware, ADMIN);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { return ok(res, await service.list(req.tenant!.id)); }
  catch (e) { next(e); }
});

router.put('/:method', async (req: Request, res: Response, next: NextFunction) => {
  try { return ok(res, await service.upsert(req.tenant!.id, req.params.method.toUpperCase(), req.body)); }
  catch (e) { next(e); }
});

export default router;
