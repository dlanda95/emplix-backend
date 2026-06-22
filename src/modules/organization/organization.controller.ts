import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';

const service = new OrganizationService();

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getDepartments(req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createDepartment(req.body, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updateDepartment(req.params.id, req.body, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteDepartment(req.params.id, req.tenantPrisma!);
    res.json({ message: 'Departamento eliminado correctamente' });
  } catch (error) { next(error); }
};

export const getPositions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId = (req.params.departmentId || req.query.departmentId) as string | undefined;
    res.json(await service.getPositions(req.tenantPrisma!, deptId));
  } catch (error) { next(error); }
};

export const createPosition = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createPosition(req.body, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const updatePosition = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updatePosition(req.params.id, req.body, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const deletePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deletePosition(req.params.id, req.tenantPrisma!);
    res.json({ message: 'Cargo eliminado correctamente' });
  } catch (error) { next(error); }
};
