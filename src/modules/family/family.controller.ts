import { Request, Response, NextFunction } from 'express';
import * as service from './family.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await service.getAll(req.user!.id, req.tenantPrisma!);
    res.json(members);
  } catch (error) { next(error); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await service.create(req.user!.id, req.body, req.tenantPrisma!);
    res.status(201).json(member);
  } catch (error) { next(error); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await service.update(req.params.id, req.user!.id, req.body, req.tenantPrisma!);
    res.json(member);
  } catch (error) { next(error); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.remove(req.params.id, req.user!.id, req.tenantPrisma!);
    res.status(204).send();
  } catch (error) { next(error); }
};
