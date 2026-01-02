import { EmployeeStatus , DocumentType} from '@prisma/client';
import { prisma } from '../../config/prisma'; // Import global
import { getScore } from './kudos.config'; 
import { AppError } from '../../shared/middlewares/error.middleware'; // Recomendado

export class KudosService {

// Obtener el muro (Filtrado por Empresa)
async getAll(tenantId: string, userId: string) {
    return await prisma.kudo.findMany({
      where: {
        tenantId: tenantId,
        // 🔒 FILTRO DE SEGURIDAD: Solo donde yo soy Emisor O Receptor
        OR: [
          { sender: { userId: userId } },   // Lo que envié (buscando por userId del empleado)
          { receiver: { userId: userId } }  // Lo que recibí
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
         select: { 
            id: true, userId: true, firstName: true, lastName: true, // Agregamos userId para comparar
            documents: { where: { type: DocumentType.AVATAR }, select: { path: true }, take: 1 },
            position: { select: { name: true } } 
          }
        },
        receiver: {
          select: { 
            id: true, userId: true, firstName: true, lastName: true, // Agregamos userId para comparar
            documents: { where: { type: DocumentType.AVATAR }, select: { path: true }, take: 1 },
            position: { select: { name: true } } 
          }
        }
      }
    });
  }
  // Crear Kudo
  async create(userId: string, receiverId: string, categoryCode: string, message: string, tenantId: string) {
    
    // 1. Identificar al EMISOR (Sender) dentro de esta empresa
    const sender = await prisma.employee.findFirst({
      where: { userId, tenantId, status: EmployeeStatus.ACTIVE }
    });

    if (!sender) throw new Error('SENDER_NOT_FOUND');

    // 2. Validar al RECEPTOR (Receiver) dentro de esta empresa
    const receiver = await prisma.employee.findUnique({
      where: { id: receiverId }
    });

    if (!receiver || receiver.tenantId !== tenantId) {
      throw new Error('RECEIVER_NOT_FOUND');
    }

    if (sender.id === receiver.id) {
      throw new AppError('No puedes enviarte aplausos a ti mismo', 400);
    }

    // 3. Crear el Kudo
    return await prisma.kudo.create({
      data: {
        categoryCode,
        message,
        // Conexiones directas usando IDs validados
        senderId: sender.id,
        receiverId: receiver.id,
        
        // OJO: Si agregaste el campo tenantId al modelo Kudo (recomendado), descomenta esto:
        tenantId: tenantId 
      }
    });
  }

  // Analítica (Ranking)
  async getAnalytics(tenantId: string) {
    
    // 1. Traemos empleados ACTIVOS de ESTA empresa
    const employees = await prisma.employee.findMany({
      where: { 
        status: EmployeeStatus.ACTIVE,
        tenantId: tenantId // <--- Filtro crítico
      }, 
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
       
        receivedKudos: {
          select: { categoryCode: true }
        }
      }
    });

    // 2. Procesamos la data en memoria
    const report = employees.map(emp => {
      
      let totalScore = 0;
      const breakdown: Record<string, number> = {};

      emp.receivedKudos.forEach(kudo => {
        breakdown[kudo.categoryCode] = (breakdown[kudo.categoryCode] || 0) + 1;
        totalScore += getScore(kudo.categoryCode);
      });

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        position: emp.position?.name || 'Sin cargo',
        totalKudos: emp.receivedKudos.length,
        totalScore: totalScore,
        breakdown: breakdown
      };
    });

    // 3. Ordenamos: Mayor puntaje primero
    return report.sort((a, b) => b.totalScore - a.totalScore);
  }
}