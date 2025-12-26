import { Request, Response, NextFunction } from 'express';
import { RequestsService } from './requests.service';
import { RequestStatus } from '@prisma/client';

const service = new RequestsService();

// --- EMPLEADO ---

export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');

    // CORRECCIÓN: El orden de argumentos debe coincidir con el servicio (body, userId, tenantId)
    const result = await service.createRequest(req.body, userId, tenantId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    if (!userId) throw new Error('Usuario no identificado');

    const result = await service.getMyRequests(userId, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getVacationBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    // Aquí no es estrictamente necesario el tenantId porque el userId es único,
    // pero el servicio ya maneja la lógica correcta.
    const result = await service.getVacationBalance(userId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- ADMIN ---

export const getAllPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; // <--- OBLIGATORIO: Solo ver de MI empresa

    // CORRECCIÓN: Usamos el método genérico getAllRequests filtrando por PENDING
    const result = await service.getAllRequests(tenantId, { status: 'PENDING' });
    res.json(result);
  } catch (error) { next(error); }
};

// Si quieres un endpoint para ver TODAS (historial), puedes agregar este:
export const getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id;
    // Pasamos los query params como filtros (ej: ?status=APPROVED&type=VACATION)
    const result = await service.getAllRequests(tenantId, req.query); 
    res.json(result);
  } catch (error) { next(error); }
};

export const processRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // Agregamos 'reason' por si rechazan con motivo
    const tenantId = req.tenant!.id;     // <--- SEGURIDAD

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    // CORRECCIÓN: Llamamos a updateRequestStatus pasando el tenantId
    const result = await service.updateRequestStatus(
      id, 
      status as RequestStatus, 
      reason, 
      tenantId
    );
    
    res.json(result);
  } catch (error) { next(error); }
};