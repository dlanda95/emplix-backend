import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login, register, checkEmailExists, getMe, microsoftLogin, verifyTenant,
  forgotPassword, verifyResetToken, resetPassword, testMailConfig,
} from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../../shared/validators/auth.validators';

const router = Router();

// Rate limiter estricto para endpoints de recuperación de contraseña
// 5 intentos por IP cada 15 minutos (separado del limiter tenant-global)
const passwordResetLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  keyGenerator:     (req) => req.ip ?? 'unknown',
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos. Espera 15 minutos.' },
  skip:             (req) => req.method === 'OPTIONS',
});

router.get('/verify-tenant', verifyTenant);

router.post('/login',       validate(loginSchema),    login);
router.post('/microsoft',   microsoftLogin);
router.post('/register',    validate(registerSchema), register);
router.post('/check-email', checkEmailExists);

// Recuperación de contraseña — rate limited por IP
router.post('/forgot-password',     passwordResetLimiter, forgotPassword);
router.get('/verify-reset-token',   passwordResetLimiter, verifyResetToken);
router.post('/reset-password',      passwordResetLimiter, resetPassword);

// Solo desarrollo — verifica configuración del proveedor de email
router.post('/test-mail', testMailConfig);

router.get('/me', authMiddleware, getMe);

export default router;
