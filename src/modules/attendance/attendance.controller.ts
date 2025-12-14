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

// NUEVO MÉTODO
export const getDailyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Recibimos la fecha por query param (?date=2025-12-14), si no, usa hoy
    const dateQuery = req.query.date ? new Date(req.query.date as string) : new Date();
    
    const result = await service.getDailyReport(dateQuery);
    res.json(result);
  } catch (error) { next(error); }
};



// NUEVO: Obtener historial personal
export const getMyHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    // Recibimos 'from' y 'to' como query params (ej: ?from=2025-12-01&to=2025-12-31)
    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const result = await service.getMyAttendanceHistory(userId, from, to);
    res.json(result);
  } catch (error) { next(error); }
};
