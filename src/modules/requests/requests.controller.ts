import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { RequestsService } from './requests.service';
import { RequestStatus } from '@prisma/client';

const service = new RequestsService();

export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    const result = await service.createRequest(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Usuario no identificado');

    const result = await service.getMyRequests(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// --- ADMIN ---

export const getAllPending = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Aquí podrías validar rol: if (req.user.role !== 'ADMIN' && req.user.role !== 'RRHH') ...
    const result = await service.getPendingRequests();
    res.json(result);
  } catch (error) { next(error); }
};

export const processRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Esperamos { status: 'APPROVED' | 'REJECTED' }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const result = await service.processRequest(id, status as RequestStatus);
    res.json(result);
  } catch (error) { next(error); }
};