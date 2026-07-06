import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../../../shared/middlewares/auth.middleware';
import { ok, created } from '../../../shared/utils/response';
import { DomainsService } from './domains.service';

const router  = Router();
const service = new DomainsService();
const ADMIN   = requireRole(['COMPANY_ADMIN']);

// ── Ruta pública: no requiere token, solo tenant header ───────────────────────
// Usada por la página de login para saber qué dominios mostrar.
router.get('/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await service.listPublic(req.tenantPrisma!);
    return ok(res, list);
  } catch (e) { next(e); }
});

// ── Rutas protegidas ──────────────────────────────────────────────────────────
router.use(authMiddleware);

router.get('/', requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']), async (req: Request, res: Response, next: NextFunction) => {
  try { return ok(res, await service.listAll(req.tenantPrisma!)); }
  catch (e) { next(e); }
});

router.post('/', ADMIN, async (req: Request, res: Response, next: NextFunction) => {
  try { return created(res, await service.create(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
});

router.patch('/:id', ADMIN, async (req: Request, res: Response, next: NextFunction) => {
  try { return ok(res, await service.update(req.params.id, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
});

router.patch('/:id/set-primary', ADMIN, async (req: Request, res: Response, next: NextFunction) => {
  try { return ok(res, await service.setPrimary(req.params.id, req.tenantPrisma!)); }
  catch (e) { next(e); }
});

router.delete('/:id', ADMIN, async (req: Request, res: Response, next: NextFunction) => {
  try { await service.remove(req.params.id, req.tenantPrisma!); return ok(res, null); }
  catch (e) { next(e); }
});

export default router;
