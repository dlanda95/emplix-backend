import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { createRequestSchema } from './requests.schemas';
import * as controller from './requests.controller';

const router = Router();

router.use(authMiddleware); // Protección global para este módulo

router.post('/', validate(createRequestSchema), controller.createRequest);
router.get('/me', controller.getMyRequests);


// Rutas Admin (Idealmente crear un middleware 'roleMiddleware')
router.get('/pending', controller.getAllPending);
router.patch('/:id/status', controller.processRequest);


// calculo vacaciones
router.get('/balance', controller.getVacationBalance); // <--- NUEVA RUTA (Poner antes de /:id para evitar conflictos)
// ...

export default router;