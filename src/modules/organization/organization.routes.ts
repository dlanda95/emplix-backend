import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { departmentSchema, positionSchema } from './organization.schemas';
import * as controller from './organization.controller';

const router = Router();

// Todas las rutas requieren estar logueado
router.use(authMiddleware);

// --- DEPARTAMENTOS ---
router.get('/departments', controller.getDepartments);
router.post('/departments', validate(departmentSchema), controller.createDepartment);
router.put('/departments/:id', validate(departmentSchema), controller.updateDepartment);
router.delete('/departments/:id', controller.deleteDepartment);



// --- CARGOS (POSITIONS) ---
// OJO AQUÍ: Esta es la ruta crítica para que funcione el "getPositions(deptId)" del front
router.get('/departments/:departmentId/positions', controller.getPositions);
// --- CARGOS ---
router.get('/positions', controller.getPositions);
router.post('/positions', validate(positionSchema), controller.createPosition);
router.put('/positions/:id', validate(positionSchema), controller.updatePosition);
router.delete('/positions/:id', controller.deletePosition);

export default router;