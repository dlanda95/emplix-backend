import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const tenantRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite de peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,

  // --- SOLUCIÓN DEFINITIVA ---
  // Eliminamos el uso de req.ip y 'validate'.
  // Al no acceder a la IP, la librería deja de lanzar el error de IPv6.
  keyGenerator: (req: Request): string => {
    // Como este middleware corre DESPUÉS de tenantMiddleware,
    // req.tenant siempre debería existir.
    if (req.tenant?.id) {
      return req.tenant.id;
    }
    
    // Si por alguna razón extraña no hay tenant (ej: error de configuración),
    // devolvemos un string genérico en lugar de la IP.
    return 'unknown-tenant'; 
  },

  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      message: '⛔ Demasiadas solicitudes desde esta organización. Por favor espere 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  
  skip: (req: Request) => req.method === 'OPTIONS'
});