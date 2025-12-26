import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';

const service = new EmployeesService();

// --- DIRECTORIO (RRHH / Admin) ---
export const getDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT
    
    // Pasamos tenantId para ver solo empleados de ESTA empresa
    const result = await service.getAllEmployees(tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id; 

    const result = await service.assignAdministrativeData(id, req.body, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- MI EQUIPO (Empleado / Manager) ---
export const getMyTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; 

    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.getMyTeamContext(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- BUSCADOR (Para Kudos, etc) ---
export const searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant!.id; 

    if (!q || typeof q !== 'string') return res.json([]);

    // Delegamos la búsqueda al servicio pasando el tenantId
    const results = await service.searchEmployees(q, tenantId);

    res.json(results);
  } catch (error) {
    next(error);
  }
};