import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Falla en arranque si JWT_SECRET no está configurado — nunca usar un fallback débil en producción.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('La variable de entorno JWT_SECRET no está definida.');

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'TOKEN_REQUIRED', message: 'No se proporcionó token de autenticación.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Express.Request['user'];

    // Defensa: el slug del token debe corresponder al tenant de la petición.
    // Evita que un token válido de empresa A acceda a empresa B.
    if (req.tenant && decoded?.tenantSlug !== req.tenant.slug) {
      return res.status(403).json({
        code:    'TENANT_TOKEN_MISMATCH',
        message: 'El token no corresponde a esta empresa.',
      });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware de autorización por rol.
 * Se aplica después de authMiddleware.
 *
 * Uso: requireRole(['COMPANY_ADMIN', 'HR_MANAGER'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Usuario no autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code:    'FORBIDDEN',
        message: 'No tienes permisos para realizar esta acción.',
      });
    }

    next();
  };
};
