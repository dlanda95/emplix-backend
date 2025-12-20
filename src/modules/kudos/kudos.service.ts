import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KudosService {

  // Crear un nuevo aplauso
 

  // Obtener el muro (incluyendo nombres y cargos)
 async getAll() {
    return await prisma.kudo.findMany({
      orderBy: { createdAt: 'desc' }, // Los más nuevos arriba
      include: {
        sender: {
          select: { firstName: true, lastName: true, position: true }
        },
        receiver: {
          select: { firstName: true, lastName: true, position: true}
        }
      }
    });
  }
  
  // (Opcional) Obtener reporte para un usuario en un rango de fechas
  async getReportByUser(userId: string, startDate: Date, endDate: Date) {
      return await prisma.kudo.findMany({
          where: {
              receiverId: userId,
              createdAt: {
                  gte: startDate,
                  lt: endDate
              }
          }
      });
  }



  // Crear Kudo conectando automáticamente el sender por su UserID
  async create(userId: string, receiverId: string, categoryCode: string, message: string) {
    return await prisma.kudo.create({
      data: {
        categoryCode,
        message,
        // Conectar al Receptor (El empleado elegido en el modal)
        receiver: { 
          connect: { id: receiverId } 
        },
        // Conectar al Emisor (El usuario logueado)
        sender: { 
          connect: { userId: userId } 
        }
      }
    });
  }
}