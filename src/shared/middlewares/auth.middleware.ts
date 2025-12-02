import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. Obtener el header "Authorization"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  // 2. Extraer el token (formato "Bearer <token>")
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verificar y decodificar
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 4. Inyectar el usuario en la petición
    req.user = decoded;
    
    next(); // Pasar al siguiente controlador
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};