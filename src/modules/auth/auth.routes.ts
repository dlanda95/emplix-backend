import { Router } from 'express';
import { login, register,checkEmailExists,getMe } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

import { validate } from '../../shared/middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../../shared/validators/auth.validators';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);

// --- NUEVA RUTA ---
router.post('/check-email', checkEmailExists);




router.get('/me', authMiddleware, getMe);

export default router;