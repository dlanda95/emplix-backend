import { Request, Response, NextFunction } from 'express';

// Error personalizado para lógica de negocio
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; 
    Error.captureStackTrace(this, this.constructor);
  }
}

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Logs detallados solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.error('🔥 ERROR:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message: message,
    // Stack trace solo en desarrollo por seguridad
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
};