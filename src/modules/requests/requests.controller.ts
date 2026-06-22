import { Request, Response, NextFunction } from 'express';
import { RequestsService } from './requests.service';
import { RequestStatus } from '../../generated/tenant-client';

const service = new RequestsService();

export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.createRequest(req.body, req.user!.id, req.tenantPrisma!);
    res.status(201).json(result);
  } catch (error) { next(error); }
};

export const getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getMyRequests(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getVacationBalance = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getVacationBalance(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getAllPending = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getAllRequests(req.tenantPrisma!, { status: 'PENDING' })); }
  catch (error) { next(error); }
};

export const getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getAllRequests(req.tenantPrisma!, req.query)); }
  catch (error) { next(error); }
};

export const processRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    const result = await service.updateRequestStatus(req.params.id, status as RequestStatus, reason, req.tenantPrisma!);
    res.json(result);
  } catch (error) { next(error); }
};
