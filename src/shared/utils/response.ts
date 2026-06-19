import { Response } from 'express';

export const ok = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json(data);
};

export const created = <T>(res: Response, data: T): void => {
  res.status(201).json(data);
};

export const paginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page = 1,
  limit = 20
): void => {
  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

export const noContent = (res: Response): void => {
  res.status(204).send();
};

export const badRequest = (res: Response, message: string, code = 'BAD_REQUEST'): void => {
  res.status(400).json({ code, message });
};

export const notFound = (res: Response, message = 'Recurso no encontrado'): void => {
  res.status(404).json({ code: 'NOT_FOUND', message });
};

export const forbidden = (res: Response, message = 'Acceso denegado'): void => {
  res.status(403).json({ code: 'FORBIDDEN', message });
};
