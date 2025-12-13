import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';

const service = new OrganizationService();

// --- DEPARTAMENTOS ---
export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getDepartments();
    res.json(result);
  } catch (error) { next(error); }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.createDepartment(req.body);
    res.status(201).json(result);
  } catch (error) { next(error); }
};

export const updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.updateDepartment(req.params.id, req.body);
    res.json(result);
  } catch (error) { next(error); }
};

export const deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteDepartment(req.params.id);
    res.json({ message: 'Departamento eliminado correctamente' });
  } catch (error) { next(error); }
};

// --- CARGOS ---
export const getPositions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // CORRECCIÓN:
    // 1. Buscamos en params (para la ruta /departments/:departmentId/positions)
    // 2. Si no está, buscamos en query (para la ruta /positions?departmentId=...)
    const deptId = req.params.departmentId || (req.query.departmentId as string);
    
    const result = await service.getPositions(deptId);
    res.json(result);
  } catch (error) { next(error); }
};

export const createPosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.createPosition(req.body);
    res.status(201).json(result);
  } catch (error) { next(error); }
};

export const updatePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.updatePosition(req.params.id, req.body);
    res.json(result);
  } catch (error) { next(error); }
};

export const deletePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deletePosition(req.params.id);
    res.json({ message: 'Cargo eliminado correctamente' });
  } catch (error) { next(error); }
};