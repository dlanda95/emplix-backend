import { Router } from 'express';
import { LaborController } from './labor.controller';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['COMPANY_ADMIN', 'HR_MANAGER']));

router.get('/shifts',       LaborController.getWorkShifts);
router.post('/shifts',      LaborController.createWorkShift);
router.put('/shifts/:id',   LaborController.updateWorkShift);
router.delete('/shifts/:id', LaborController.deleteWorkShift);

router.get('/contracts',        LaborController.getContractTypes);
router.post('/contracts',       LaborController.createContractType);
router.put('/contracts/:id',    LaborController.updateContractType);
router.delete('/contracts/:id', LaborController.deleteContractType);

export const laborRoutes = router;
