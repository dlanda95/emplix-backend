import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import * as controller from './attendance.controller';

const router = Router();

router.use(authMiddleware);

router.get('/today', controller.getStatus);
router.post('/clock-in', controller.clockIn);
router.post('/clock-out', controller.clockOut);
// NUEVA RUTA (Asegúrate de que solo admins puedan verla si tienes roles)
router.get('/report', controller.getDailyReport); // GET /api/attendance/report

router.get('/my-attendance',controller.getMyHistory)
export default router;