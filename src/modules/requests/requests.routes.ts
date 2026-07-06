import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createRequestSchema } from './requests.schemas';
import * as controller from './requests.controller';

const router = Router();

router.use(authMiddleware);

// ── Rutas del empleado (cualquier usuario autenticado) ────────────────────────
router.post('/',        validate(createRequestSchema), controller.createRequest);
router.get('/me',       controller.getMyRequests);
router.get('/balance',  controller.getVacationBalance); // IMPORTANTE: antes de /:id

// ── Rutas administrativas ─────────────────────────────────────────────────────
const HR_READ  = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']);
const HR_WRITE = requireRole(['COMPANY_ADMIN', 'HR_MANAGER']);

router.get('/',             HR_READ,  controller.getAllRequests);
router.get('/pending',      HR_READ,  controller.getAllPending);
router.patch('/:id/status', HR_WRITE, controller.processRequest);

export default router;
