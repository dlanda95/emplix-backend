import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';

const service = new AttendanceService();

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');
    
    // Pasamos tenantId al servicio
    const result = await service.getTodayStatus(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

export const clockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.clockIn(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

export const clockOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.clockOut(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// REPORTES ADMIN
export const getDailyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT
    const dateQuery = req.query.date ? new Date(req.query.date as string) : new Date();
    
    const result = await service.getDailyReport(dateQuery, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// HISTORIAL PERSONAL
export const getMyHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');

    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const result = await service.getMyAttendanceHistory(userId, from, to, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};