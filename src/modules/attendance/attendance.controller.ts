import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { AttendanceService } from './attendance.service';

const service = new AttendanceService();

export const getStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');
    const result = await service.getTodayStatus(userId);
    res.json(result);
  } catch (error) { next(error); }
};

export const clockIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');
    const result = await service.clockIn(userId);
    res.json(result);
  } catch (error) { next(error); }
};

export const clockOut = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');
    const result = await service.clockOut(userId);
    res.json(result);
  } catch (error) { next(error); }
};