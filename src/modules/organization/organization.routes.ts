import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { areaSchema, subareaSchema, positionSchema } from './organization.schemas';
import * as controller from './organization.controller';

const router = Router();

router.use(authMiddleware);

// ── Retrocompatibilidad: candidatos/empleados llaman a /departments ─────────
router.get('/departments', controller.getDepartments);

// ── ÁREAS ────────────────────────────────────────────────────────────────────
// Lectura: cualquier usuario autenticado
router.get('/areas',     controller.getAreas);

// Escritura: solo RRHH (HR_MANAGER o COMPANY_ADMIN)
router.post(  '/areas',     requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(areaSchema),    controller.createArea);
router.put(   '/areas/:id', requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(areaSchema),    controller.updateArea);
router.delete('/areas/:id', requireRole(['HR_MANAGER', 'COMPANY_ADMIN']),                          controller.deleteArea);

// ── SUBÁREAS ─────────────────────────────────────────────────────────────────
router.get(   '/areas/:parentId/subareas', controller.getSubareas);
router.post(  '/areas/:parentId/subareas', requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(subareaSchema), controller.createSubarea);

// Editar/borrar subárea reutiliza los endpoints de área (son el mismo modelo)
router.put(   '/areas/:id/edit',    requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(areaSchema), controller.updateArea);
router.delete('/areas/:id/delete',  requireRole(['HR_MANAGER', 'COMPANY_ADMIN']),                       controller.deleteArea);

// ── CARGOS ───────────────────────────────────────────────────────────────────
router.get(   '/positions',                              controller.getPositions);
router.get(   '/departments/:departmentId/positions',    controller.getPositions);
router.post(  '/positions',     requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(positionSchema), controller.createPosition);
router.put(   '/positions/:id', requireRole(['HR_MANAGER', 'COMPANY_ADMIN']), validate(positionSchema), controller.updatePosition);
router.delete('/positions/:id', requireRole(['HR_MANAGER', 'COMPANY_ADMIN']),                           controller.deletePosition);

export default router;
