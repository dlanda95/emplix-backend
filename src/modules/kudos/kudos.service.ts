import { EmployeeStatus, PrismaClient } from '@prisma/client';
import { getScore } from './kudos.config'; // Importamos la config

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


async getAnalytics() {
    // 1. Traemos a TODOS los empleados activos con sus kudos recibidos
    const employees = await prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE }, // Solo activos
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
       
        receivedKudos: {
          select: { categoryCode: true } // Solo necesitamos la categoría para sumar
        }
      }
    });

    // 2. Procesamos la data en memoria (Transformación)
    // Convertimos la lista plana de empleados en el formato de reporte
    const report = employees.map(emp => {
      
      let totalScore = 0;
      const breakdown: Record<string, number> = {};

      // Recorremos sus aplausos para sumar puntos y agrupar por categoría
      emp.receivedKudos.forEach(kudo => {
        // Conteo por categoría
        breakdown[kudo.categoryCode] = (breakdown[kudo.categoryCode] || 0) + 1;
        
        // Suma de puntaje (Score)
        totalScore += getScore(kudo.categoryCode);
      });

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position || 'Sin cargo',
     
        totalKudos: emp.receivedKudos.length, // Cantidad total
        totalScore: totalScore,               // Puntaje ponderado
        breakdown: breakdown                  // Desglose { 'TEAMWORK': 5, ... }
      };
    });

    // 3. Ordenamos: Los que tienen más puntaje primero (Ranking)
    return report.sort((a, b) => b.totalScore - a.totalScore);
  }
}





