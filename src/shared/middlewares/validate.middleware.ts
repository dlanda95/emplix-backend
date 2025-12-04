
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodError = error as ZodError;

        return res.status(400).json({
          status: 'error',
          message: 'Datos de entrada inválidos',
          errors: zodError.issues.map((issue) => ({
            field: issue.path.join('.'), // más útil para objetos anidados
            message: issue.message,
            code: issue.code,            // opcional: tipo de error zod
          })),
        });
      }

      return res.status(500).json({ message: 'Error de validación interno' });
    }
  };
``
