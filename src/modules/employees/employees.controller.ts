import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';

import { AuthRequest } from '../../shared/middlewares/auth.middleware';

const service = new EmployeesService();

export const getDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getAllEmployees();
    res.json(result);
  } catch (error) { next(error); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await service.assignAdministrativeData(id, req.body);
    res.json(result);
  } catch (error) { next(error); }
};


export const getMyTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.getMyTeamContext(userId);
    res.json(result);
  } catch (error) { next(error); }
};