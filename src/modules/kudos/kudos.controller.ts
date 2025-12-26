import { Request, Response, NextFunction } from 'express';
import { KudosService } from './kudos.service';

const kudosService = new KudosService();

export const createKudo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; 
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT
    const { receiverId, categoryCode, message } = req.body;

    if (!userId) return res.status(401).json({ message: 'No autenticado' });

    // Pasamos tenantId para asegurar que el aplauso se guarde en la empresa correcta
    const newKudo = await kudosService.create(userId, receiverId, categoryCode, message, tenantId);
    
    res.status(201).json(newKudo);

  } catch (error: any) {
    // Manejo de errores específico
    if (error.message === 'SENDER_NOT_FOUND') {
       return res.status(400).json({ message: 'No se encontró tu perfil de empleado activo en esta empresa.' });
    }
    if (error.message === 'RECEIVER_NOT_FOUND') {
       return res.status(404).json({ message: 'El destinatario no existe o no pertenece a esta empresa.' });
    }
    next(error);
  }
};

export const getWall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT

    // Solo traemos el muro de ESTA empresa
    const rawKudos = await kudosService.getAll(tenantId);

    // Mapeo de datos para el Frontend
    const formatted = rawKudos.map(k => ({
      id: k.id,
      from: { 
        name: `${k.sender.firstName} ${k.sender.lastName}`, 
        position: k.sender.position?.name || 'Sin Cargo', // Protegemos si es null
      },
      to: { 
        name: `${k.receiver.firstName} ${k.receiver.lastName}`, 
        position: k.receiver.position?.name || 'Sin Cargo',
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

export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; // <--- CAPTURAR TENANT
    
    // Reporte solo de ESTA empresa
    const report = await kudosService.getAnalytics(tenantId);
    res.json(report);
  } catch (error) {
    next(error);
  }
};