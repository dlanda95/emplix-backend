import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { RequestsService } from './requests.service';

const service = new RequestsService();

export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    const result = await service.createRequest(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    const result = await service.getMyRequests(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};