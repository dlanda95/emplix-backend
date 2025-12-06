import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import * as controller from './employees.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', controller.getDirectory);
router.patch('/:id/assign', controller.updateAssignment);

export default router;