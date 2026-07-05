import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import * as controller from './users.controller';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(['COMPANY_ADMIN', 'HR_MANAGER']));

router.get('/',                          controller.listUsers);
router.post('/',                         controller.createSystemUser);
router.patch('/:id/system-type',         controller.updateUserType);
router.patch('/:id/role',                controller.updateRole);
router.patch('/:id/toggle-status',       controller.toggleStatus);

export default router;
