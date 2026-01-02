import { Request, Response, NextFunction } from 'express';
import { KudosService } from './kudos.service';

const kudosService = new KudosService();


// 👇 HELPER LOCAL PARA GENERAR LA URL (Igual que en employees)
const getPublicUrl = (path: string | undefined) => {
  if (!path) return null;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) return null;
  return `https://${accountName}.blob.core.windows.net/public-assets/${path}`;
};


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
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; // ID del usuario logueado (Auth)

    // Pasamos el userId al servicio
    const rawKudos = await kudosService.getAll(tenantId, userId);

    const formatted = rawKudos.map(k => {
      const senderDoc = k.sender.documents[0];
      const receiverDoc = k.receiver.documents[0];

      // 👇 TRUCO: Determinamos el tipo aquí mismo
      // Si el userId del sender coincide con el mío, es 'SENT', si no, es 'RECEIVED'
      const type = k.sender.userId === userId ? 'SENT' : 'RECEIVED';

      return {
        id: k.id,
        message: k.message,
        categoryCode: k.categoryCode,
        createdAt: k.createdAt,
        type: type, // <--- NUEVO CAMPO PARA EL FRONTEND

        sender: {
          id: k.sender.id,
          firstName: k.sender.firstName,
          lastName: k.sender.lastName,
          photoUrl: getPublicUrl(senderDoc?.path), 
          position: k.sender.position?.name
        },
        receiver: {
          id: k.receiver.id,
          firstName: k.receiver.firstName,
          lastName: k.receiver.lastName,
          photoUrl: getPublicUrl(receiverDoc?.path),
          position: k.receiver.position?.name
        }
      };
    });

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