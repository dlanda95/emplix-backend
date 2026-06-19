import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode: number, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Error interno del servidor';
  const code       = err.code       || 'INTERNAL_ERROR';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${code}:`, err.message);
  }

  res.status(statusCode).json({ code, message });
};
