import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';



export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verificamos y casteamos al tipo correcto que definimos globalmente
    const decoded = jwt.verify(token, JWT_SECRET) as Express.UserPayload;
    
    // ¡Ahora esto es legal y estricto!
    // req.user espera un UserPayload y decoded ES un UserPayload.
    req.user = decoded;
    
    next(); 
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
