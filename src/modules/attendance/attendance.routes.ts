import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import * as controller from './attendance.controller';

const router = Router();

router.use(authMiddleware);

router.get('/today', controller.getStatus);
router.post('/clock-in', controller.clockIn);
router.post('/clock-out', controller.clockOut);

export default router;