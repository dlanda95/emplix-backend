import { Request, Response, NextFunction } from 'express';
import { LaborService } from './labor.service';

const service = new LaborService();

export class LaborController {

  static async getWorkShifts(req: Request, res: Response, next: NextFunction) {
    try { res.json(await service.getWorkShifts(req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async createWorkShift(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await service.createWorkShift(req.body, req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async updateWorkShift(req: Request, res: Response, next: NextFunction) {
    try { res.json(await service.updateWorkShift(req.params.id, req.body, req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async deleteWorkShift(req: Request, res: Response, next: NextFunction) {
    try { await service.deleteWorkShift(req.params.id, req.tenantPrisma!); res.status(204).send(); }
    catch (error) { next(error); }
  }

  static async getContractTypes(req: Request, res: Response, next: NextFunction) {
    try { res.json(await service.getContractTypes(req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async createContractType(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await service.createContractType(req.body, req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async updateContractType(req: Request, res: Response, next: NextFunction) {
    try { res.json(await service.updateContractType(req.params.id, req.body, req.tenantPrisma!)); }
    catch (error) { next(error); }
  }

  static async deleteContractType(req: Request, res: Response, next: NextFunction) {
    try { await service.deleteContractType(req.params.id, req.tenantPrisma!); res.status(204).send(); }
    catch (error) { next(error); }
  }
}
