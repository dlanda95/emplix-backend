import { prisma } from '../../config/prisma';
import { RequestStatus, RequestType } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware'; 

export class RequestsService {

  // --- CREAR SOLICITUD ---
  // CORRECCIÓN: Ahora recibe (body, userId, tenantId) para coincidir con el controlador
  async createRequest(payload: any, userId: string, tenantId: string) {
    
    // Convertir fechas string a Date si vienen
    const startDate = payload.startDate ? new Date(payload.startDate) : null;
    const endDate = payload.endDate ? new Date(payload.endDate) : null;

    return await prisma.request.create({
      data: {
        type: payload.type,
        startDate: startDate,
        endDate: endDate,
        reason: payload.reason,
        data: payload.data || {}, // Payload JSON extra (ej: para Profile Update)
        status: 'PENDING',
        
        userId: userId,
        tenantId: tenantId // <--- OBLIGATORIO: Vinculado a la empresa
      }
    });
  }

  // --- MIS SOLICITUDES (Empleado) ---
  async getMyRequests(userId: string, tenantId: string) {
    return await prisma.request.findMany({
      where: {
        userId: userId,
        tenantId: tenantId // <--- Filtro de seguridad
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- TODAS LAS SOLICITUDES (Admin) ---
  // Renombrado a getAllRequests para soportar filtros (Pendientes, Aprobadas, etc.)
  async getAllRequests(tenantId: string, filters: any = {}) {
    
    const whereClause: any = { tenantId }; // BASE: Solo ver solicitudes de MI empresa

    // Aplicar filtros dinámicos
    if (filters.status) whereClause.status = filters.status;
    if (filters.type) whereClause.type = filters.type;

    return await prisma.request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            email: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                documentId: true,
                position: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- ACTUALIZAR ESTADO (Aprobar/Rechazar) ---
  // Renombrado a updateRequestStatus para coincidir con el controlador
  async updateRequestStatus(requestId: string, status: RequestStatus, reason: string | undefined, tenantId: string) {
    
    return await prisma.$transaction(async (tx) => {
      
      // A. Buscar la solicitud (y validar que pertenezca al Tenant)
      const request = await tx.request.findUnique({ where: { id: requestId } });
      
      if (!request) throw new AppError('Solicitud no encontrada', 404);
      
      // SEGURIDAD CRÍTICA: Impedir aprobar solicitudes de otras empresas
      if (request.tenantId !== tenantId) {
        throw new AppError('No tienes permisos para gestionar esta solicitud', 403);
      }

      if (request.status !== 'PENDING') {
        throw new AppError('Esta solicitud ya fue procesada anteriormente', 400);
      }

      // B. LÓGICA ESPECIAL: Si es PROFILE_UPDATE y se APRUEBA
      if (status === 'APPROVED' && request.type === 'PROFILE_UPDATE') {
        const changes = request.data as any; 
        
        if (changes) {
          // Extraemos birthDate para convertirlo manualmente
          const { birthDate, ...restOfData } = changes;
          const dataToUpdate: any = { ...restOfData };
        
          if (birthDate) {
            dataToUpdate.birthDate = new Date(birthDate); 
          }

          // Actualizamos el empleado
          await tx.employee.update({
            where: { userId: request.userId },
            data: dataToUpdate 
          });
        }
      }

      // C. Actualizar el estado de la solicitud
      return await tx.request.update({
        where: { id: requestId },
        data: {
          status,
          // Si el admin envía un motivo (reason) lo guardamos, sino mantenemos el original
          reason: reason || request.reason 
        }
      });

    });
  }

  // --- CÁLCULO DE VACACIONES (Kárdex) ---
  async getVacationBalance(userId: string) {
    // 1. Obtener datos del empleado
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, hireDate: true }
    });

    if (!employee) throw new Error('Empleado no encontrado');

    // 2. Calcular días GANADOS (30 días anuales = 2.5 por mes)
    const today = new Date();
    const monthsWorked = this.monthDiff(employee.hireDate, today);
    const daysEarned = monthsWorked * 2.5;

    // 3. Calcular días USADOS
    // IMPORTANTE: Filtrar por Status APPROVED
    const approvedVacations = await prisma.request.findMany({
      where: {
        userId,
        type: 'VACATION',
        status: 'APPROVED'
      }
    });

    let daysUsed = 0;
    approvedVacations.forEach(req => {
      if (req.startDate && req.endDate) {
        // +1 para incluir el día de inicio
        const days = this.daysDiff(req.startDate, req.endDate) + 1; 
        daysUsed += days;
      }
    });

    const balance = daysEarned - daysUsed;

    return {
      hireDate: employee.hireDate,
      monthsWorked,
      daysEarned,
      daysUsed,
      balance: parseFloat(balance.toFixed(2))
    };
  }

  // --- Helpers de Fecha ---
  private monthDiff(d1: Date, d2: Date): number {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    if (d2.getDate() < d1.getDate()) { 
        months--; 
    }
    return months <= 0 ? 0 : months;
  }

  private daysDiff(start: Date, end: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; 
    return Math.round(Math.abs((start.getTime() - end.getTime()) / oneDay));
  }
}