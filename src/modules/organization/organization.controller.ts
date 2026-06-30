import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';

const service = new OrganizationService();

// ── ÁREAS ──────────────────────────────────────────────────────────────────

export const getAreas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    res.json(await service.getAreas(req.tenantPrisma!, includeInactive));
  } catch (e) { next(e); }
};

export const createArea = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createArea(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const updateArea = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updateArea(req.params.id, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const deleteArea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteArea(req.params.id, req.tenantPrisma!);
    res.json({ message: 'Área eliminada correctamente' });
  } catch (e) { next(e); }
};

// ── SUBÁREAS ───────────────────────────────────────────────────────────────

export const getSubareas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    res.json(await service.getSubareas(req.params.parentId, req.tenantPrisma!, includeInactive));
  } catch (e) { next(e); }
};

export const createSubarea = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createSubarea(req.params.parentId, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

// ── CARGOS ─────────────────────────────────────────────────────────────────

export const getPositions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptId          = (req.params.departmentId || req.query.departmentId) as string | undefined;
    const includeInactive = req.query.includeInactive === 'true';
    res.json(await service.getPositions(req.tenantPrisma!, deptId, includeInactive));
  } catch (e) { next(e); }
};

export const createPosition = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(await service.createPosition(req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const updatePosition = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.updatePosition(req.params.id, req.body, req.tenantPrisma!)); }
  catch (e) { next(e); }
};

export const deletePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deletePosition(req.params.id, req.tenantPrisma!);
    res.json({ message: 'Cargo eliminado correctamente' });
  } catch (e) { next(e); }
};

// ── Retrocompatibilidad para candidatos/empleados ──────────────────────────

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getDepartments(req.tenantPrisma!)); }
  catch (e) { next(e); }
};
