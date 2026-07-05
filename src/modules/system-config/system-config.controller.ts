import { Request, Response, NextFunction } from 'express';
import { SystemConfigService } from './system-config.service';

const svc = new SystemConfigService();

export const listUserTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listUserTypes(req.tenantPrisma!);
    res.json(data);
  } catch (e) { next(e); }
};

export const getUserType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getUserType(req.params['id'], req.tenantPrisma!);
    res.json(data);
  } catch (e) { next(e); }
};

export const createUserType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createUserType(req.body, req.tenantPrisma!);
    res.status(201).json(data);
  } catch (e) { next(e); }
};

export const updateUserType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.updateUserType(req.params['id'], req.body, req.tenantPrisma!);
    res.json(data);
  } catch (e) { next(e); }
};

export const deleteUserType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteUserType(req.params['id'], req.tenantPrisma!);
    res.status(204).end();
  } catch (e) { next(e); }
};
