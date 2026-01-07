import { Router } from 'express';
import { LaborController } from './labor.controller';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { SystemRole } from '@prisma/client';

const router = Router();

// Middleware Global: Requiere Auth y Admin de Empresa
router.use(authMiddleware);
router.use(requireRole([SystemRole.COMPANY_ADMIN, SystemRole.GLOBAL_ADMIN]));

// --- WORK SHIFTS ---
router.get('/shifts', LaborController.getWorkShifts);
router.post('/shifts', LaborController.createWorkShift);
router.put('/shifts/:id', LaborController.updateWorkShift);
router.delete('/shifts/:id', LaborController.deleteWorkShift);

// --- CONTRACT TYPES ---
router.get('/contracts', LaborController.getContractTypes);
router.post('/contracts', LaborController.createContractType);
router.put('/contracts/:id', LaborController.updateContractType);
router.delete('/contracts/:id', LaborController.deleteContractType);

export const laborRoutes = router;