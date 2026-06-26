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

// ── Rutas administrativas (solo RRHH y admins) ────────────────────────────────
router.get('/pending',      requireRole(['COMPANY_ADMIN', 'HR_MANAGER']), controller.getAllPending);
router.patch('/:id/status', requireRole(['COMPANY_ADMIN', 'HR_MANAGER']), controller.processRequest);

export default router;
