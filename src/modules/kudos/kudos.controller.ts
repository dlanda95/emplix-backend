import { Request, Response, NextFunction } from 'express';
import { KudosService } from './kudos.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware'; // Asegúrate de importar tu interfaz

import { PrismaClient } from '@prisma/client'; // <--- Importante

const kudosService = new KudosService();

const prisma = new PrismaClient();


export const createKudo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // ID del login (Token)
    const { receiverId, categoryCode, message } = req.body;

    if (!userId) return res.status(401).json({ message: 'No autenticado' });

    const newKudo = await kudosService.create(userId, receiverId, categoryCode, message);
    
    res.status(201).json(newKudo);

  } catch (error: any) {
    // Error P2025: Prisma no encontró el registro para conectar (ej. Usuario sin Empleado)
    if (error.code === 'P2025') {
       return res.status(400).json({ message: 'Error: Tu usuario no está vinculado a un empleado activo o el destinatario no existe.' });
    }
    next(error);
  }
};

export const getWall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawKudos = await kudosService.getAll();

    // Mapeo de datos para el Frontend (Formato limpio)
    const formatted = rawKudos.map(k => ({
      id: k.id,
      from: { 
        name: `${k.sender.firstName} ${k.sender.lastName}`, 
        position: k.sender.position,
        
      },
      to: { 
        name: `${k.receiver.firstName} ${k.receiver.lastName}`, 
        position: k.receiver.position,
        
      },
      categoryCode: k.categoryCode,
      message: k.message,
      date: k.createdAt
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};


// NUEVO MÉTODO
export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await kudosService.getAnalytics();
    res.json(report);
  } catch (error) {
    next(error);
  }
};