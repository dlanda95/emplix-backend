import { Request, Response, NextFunction } from 'express';
import { KudosService } from './kudos.service';

const service = new KudosService();

const getPublicUrl = (path: string | undefined) => {
  if (!path) return null;
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  return account ? `https://${account}.blob.core.windows.net/public-assets/${path}` : null;
};

export const createKudo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverId, categoryCode, message } = req.body;
    const kudo = await service.create(req.user!.id, receiverId, categoryCode, message, req.tenantPrisma!);
    res.status(201).json(kudo);
  } catch (error: any) {
    if (error.message === 'SENDER_NOT_FOUND') return res.status(400).json({ message: 'No se encontró tu perfil de empleado activo.' });
    if (error.message === 'RECEIVER_NOT_FOUND') return res.status(404).json({ message: 'El destinatario no existe.' });
    next(error);
  }
};

export const getWall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = await service.getAll(req.user!.id, req.tenantPrisma!);
    const formatted = raw.map(k => ({
      id: k.id,
      message: k.message,
      categoryCode: k.categoryCode,
      createdAt: k.createdAt,
      type: k.sender.userId === req.user!.id ? 'SENT' : 'RECEIVED',
      sender: {
        id: k.sender.id,
        firstName: k.sender.firstName,
        lastName: k.sender.lastName,
        photoUrl: getPublicUrl(k.sender.documents[0]?.path),
        position: k.sender.position?.name,
      },
      receiver: {
        id: k.receiver.id,
        firstName: k.receiver.firstName,
        lastName: k.receiver.lastName,
        photoUrl: getPublicUrl(k.receiver.documents[0]?.path),
        position: k.receiver.position?.name,
      },
    }));
    res.json(formatted);
  } catch (error) { next(error); }
};

export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await service.getAnalytics(req.tenantPrisma!)); }
  catch (error) { next(error); }
};
