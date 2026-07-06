import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import * as controller from './users.controller';

const router = Router();
router.use(authMiddleware);

const HR_READ  = requireRole(['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST']);
const HR_WRITE = requireRole(['COMPANY_ADMIN', 'HR_MANAGER']);

router.get('/',                    HR_READ,  controller.listUsers);
router.post('/',                   HR_WRITE, controller.createSystemUser);
router.patch('/:id/system-type',   HR_WRITE, controller.updateUserType);
router.patch('/:id/role',          HR_WRITE, controller.updateRole);
router.patch('/:id/toggle-status', HR_WRITE, controller.toggleStatus);

export default router;
