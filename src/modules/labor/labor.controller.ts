import { Request, Response, NextFunction } from 'express';
import { LaborService } from './labor.service';

const service = new LaborService();

export class LaborController {
  
  // --- WORK SHIFTS ---
  static async getWorkShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.getWorkShifts(req.user!.tenantId);
      res.json(result);
    } catch (error) { next(error); }
  }

  static async createWorkShift(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.createWorkShift(req.body, req.user!.tenantId);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }

  static async updateWorkShift(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.updateWorkShift(req.params.id, req.body, req.user!.tenantId);
      res.json(result);
    } catch (error) { next(error); }
  }

  static async deleteWorkShift(req: Request, res: Response, next: NextFunction) {
    try {
      await service.deleteWorkShift(req.params.id, req.user!.tenantId);
      res.status(204).send();
    } catch (error) { next(error); }
  }

  // --- CONTRACT TYPES ---
  static async getContractTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.getContractTypes(req.user!.tenantId);
      res.json(result);
    } catch (error) { next(error); }
  }

  static async createContractType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.createContractType(req.body, req.user!.tenantId);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }

  static async updateContractType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.updateContractType(req.params.id, req.body, req.user!.tenantId);
      res.json(result);
    } catch (error) { next(error); }
  }

  static async deleteContractType(req: Request, res: Response, next: NextFunction) {
    try {
      await service.deleteContractType(req.params.id, req.user!.tenantId);
      res.status(204).send();
    } catch (error) { next(error); }
  }
}