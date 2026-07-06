import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import * as controller from './system-config.controller';

const router = Router();

router.use(authMiddleware);

const HR_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ANALYST'];

router.get('/',    requireRole(HR_ROLES), controller.listUserTypes);
router.get('/:id', requireRole(HR_ROLES), controller.getUserType);
router.post('/',      requireRole(['COMPANY_ADMIN']), controller.createUserType);
router.patch('/:id',  requireRole(['COMPANY_ADMIN']), controller.updateUserType);
router.delete('/:id', requireRole(['COMPANY_ADMIN']), controller.deleteUserType);

export default router;
