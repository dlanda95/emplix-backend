import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';

const service = new AttendanceService();

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getTodayStatus(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const clockIn = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.clockIn(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const clockOut = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.clockOut(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getDailyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    res.json(await service.getDailyReport(date, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const getMyHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    res.json(await service.getMyAttendanceHistory(req.user!.id, from, to, req.tenantPrisma!));
  } catch (error) { next(error); }
};
