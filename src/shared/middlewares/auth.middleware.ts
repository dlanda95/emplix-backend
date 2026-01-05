import { Request, Response, NextFunction } from 'express';
import { SystemRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Casteamos directamente al tipo Global de Express
    const decoded = jwt.verify(token, JWT_SECRET) as Express.UserPayload;
    
    // Validación Cruzada
    if (req.tenant && decoded.tenantId !== req.tenant.id) {
      return res.status(403).json({ 
        message: 'Acceso Denegado: Tu usuario no pertenece a esta empresa.' 
      });
    }

    req.user = decoded; // Ahora sí coinciden perfectamente
    next(); 
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};


// 👇 AGREGA ESTA FUNCIÓN AL FINAL
export const requireRole = (allowedRoles: SystemRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    // Convertimos el string del token al Enum real para comparar
    const userRole = req.user.role as SystemRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'No tienes permisos suficientes para realizar esta acción.' 
      });
    }

    next();
  };
};