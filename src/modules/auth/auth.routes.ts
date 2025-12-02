import { Router } from 'express';
import { login, register,checkEmailExists,getMe } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register (Opcional, útil para seed inicial)
router.post('/register', register);


// --- NUEVA RUTA ---
router.post('/check-email', checkEmailExists);




router.get('/me', authMiddleware, getMe);

export default router;