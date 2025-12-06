import { prisma } from '../../config/prisma';
import { RequestType } from '@prisma/client';

export class RequestsService {

  async createRequest(userId: string, payload: any) {
    // Preparamos los datos
    const { type, reason, startDate, endDate, data } = payload;

    // Creamos el registro en la tabla 'requests'
    return await prisma.request.create({
      data: {
        userId,
        type: type as RequestType,
        status: 'PENDING', // Siempre nace pendiente
        reason,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        data: data || {} // Guardamos el objeto de cambios aquí
      }
    });
  }

  // Método para que el empleado vea SU historial
  async getMyRequests(userId: string) {
    return await prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}