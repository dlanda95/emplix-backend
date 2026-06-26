import { Request, Response, NextFunction } from 'express';
import { KudosService, formatEmployeeForKudo } from './kudos.service';

const service = new KudosService();

export const createKudo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverId, categoryCode, message } = req.body;
    const kudo = await service.create(
      req.user!.id, receiverId, categoryCode, message, req.tenantPrisma!,
    );
    res.status(201).json(kudo);
  } catch (error) {
    next(error);
  }
};

export const getWall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = await service.getAll(req.user!.id, req.tenantPrisma!);

    const formatted = raw.map(k => ({
      id:           k.id,
      message:      k.message,
      categoryCode: k.categoryCode,
      createdAt:    k.createdAt,
      // El tipo indica si el usuario logueado envió o recibió este kudo
      type:     k.sender.userId === req.user!.id ? 'SENT' : 'RECEIVED',
      sender:   formatEmployeeForKudo(k.sender),
      receiver: formatEmployeeForKudo(k.receiver),
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await service.getAnalytics(req.tenantPrisma!));
  } catch (error) {
    next(error);
  }
};
