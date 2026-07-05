import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import * as controller from './system-config.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(['COMPANY_ADMIN']));

router.get('/',          controller.listUserTypes);
router.get('/:id',       controller.getUserType);
router.post('/',         controller.createUserType);
router.patch('/:id',     controller.updateUserType);
router.delete('/:id',    controller.deleteUserType);

export default router;
