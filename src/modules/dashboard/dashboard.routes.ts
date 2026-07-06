import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { ok } from '../../shared/utils/response';

const router = Router();
const HR_READ = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']);

router.use(authMiddleware);

router.get('/stats', HR_READ, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantPrisma!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEmployees, pendingRequests, newHiresThisMonth, pendingCandidates] = await Promise.all([
      db.employee.count({ where: { status: 'ACTIVE' } }),
      db.request.count({ where: { status: 'PENDING' } }),
      db.employee.count({ where: { status: 'ACTIVE', hireDate: { gte: startOfMonth } } }),
      db.employee.count({ where: { status: 'SELECTED' } }),
    ]);

    return ok(res, { totalEmployees, pendingRequests, newHiresThisMonth, pendingCandidates });
  } catch (e) { next(e); }
});

router.get('/recent-requests', HR_READ, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = req.tenantPrisma!;

    const requests = await db.request.findMany({
      where:   { status: 'PENDING' },
      take:    5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email:    true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const result = requests.map(r => ({
      id:        r.id,
      type:      r.type,
      createdAt: r.createdAt,
      userName:  r.user.employee
        ? `${r.user.employee.firstName} ${r.user.employee.lastName}`
        : r.user.email,
    }));

    return ok(res, result);
  } catch (e) { next(e); }
});

export default router;
