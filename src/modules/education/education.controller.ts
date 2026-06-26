import { Request, Response, NextFunction } from 'express';
import * as service from './education.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await service.getAll(req.user!.id, req.tenantPrisma!);
    res.json(records);
  } catch (error) { next(error); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await service.create(req.user!.id, req.body, req.tenantPrisma!);
    res.status(201).json(record);
  } catch (error) { next(error); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await service.update(req.params.id, req.user!.id, req.body, req.tenantPrisma!);
    res.json(record);
  } catch (error) { next(error); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.params.id, req.user!.id, req.tenantPrisma!);
    res.status(204).send();
  } catch (error) { next(error); }
};
