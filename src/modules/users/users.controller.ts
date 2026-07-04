import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { ok, created } from '../../shared/utils/response';

const service = new UsersService();

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.listUsers(req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const createSystemUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { created(res, await service.createSystemUser(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.updateRole(req.params.id, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.toggleStatus(req.params.id, req.tenantPrisma!)); }
  catch (e) { next(e); }
};
