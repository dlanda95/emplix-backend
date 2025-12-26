import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware'; // Tu middleware
import * as kudosController from './kudos.controller';

const router = Router();

// Todas las rutas requieren estar logueado
router.use(authMiddleware);

router.get('/', kudosController.getWall);      // GET /api/kudos
router.get('/analytics', kudosController.getReport); // <--- NUEVA RUTA (Reporte)
router.post('/', kudosController.createKudo);  // POST /api/kudos

export default router;