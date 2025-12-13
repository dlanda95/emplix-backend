import { prisma } from '../../config/prisma';
import { RequestType, RequestStatus } from '@prisma/client';
import { differenceInMonths, differenceInDays } from 'date-fns'; // Necesitarás instalar date-fns o usar lógica nativa
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





  // --- MÉTODOS DE ADMINISTRADOR ---

  // 1. Obtener todas las solicitudes pendientes (con datos del empleado)
  async getPendingRequests() {
    return await prisma.request.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                position: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 2. Procesar Solicitud (Aprobar/Rechazar)
  async processRequest(requestId: string, status: RequestStatus, adminComment?: string) {
    
    // Iniciamos una transacción para asegurar integridad
    return await prisma.$transaction(async (tx) => {
      
      // A. Buscar la solicitud
      const request = await tx.request.findUnique({ where: { id: requestId } });
      if (!request) throw new Error('Solicitud no encontrada');
      if (request.status !== 'PENDING') throw new Error('Esta solicitud ya fue procesada');

      // B. Si es APROBADA y es de tipo PROFILE_UPDATE, aplicamos cambios
      if (status === 'APPROVED' && request.type === 'PROFILE_UPDATE') {
        const changes = request.data as any; // El JSON con los datos nuevos
        
        if (changes) {

        // 1. Separamos 'birthDate' del resto de campos para tratarlo especial
          // (Si tu front manda 'birthDate', úsalo aquí. Si manda 'dateOfBirth', cámbialo)
          const { birthDate, ...restOfData } = changes;
          
          // 2. Preparamos el objeto limpio
        const dataToUpdate: any = { ...restOfData };
        
        // 3. CONVERSIÓN: String -> Date Object
          // Esto soluciona el "Invalid value... Expected ISO-8601 DateTime"
          if (birthDate) {
            dataToUpdate.birthDate = new Date(birthDate); 
          }

          await tx.employee.update({
            where: { userId: request.userId },
            data: dataToUpdate // <--- ESTO ES LO QUE FALTABA
              // Opcional: Podrías guardar un log de quién aprobó si tuvieras tabla de auditoría
            
          });
        }
      }

      // C. Actualizar el estado de la solicitud
      return await tx.request.update({
        where: { id: requestId },
        data: {
          status,
          // Podríamos agregar un campo 'adminComment' al modelo Request si quisieras guardar el motivo del rechazo
        }
      });

    });
  }







// --- CÁLCULO DE VACACIONES (KÁRDEX) ---


async getVacationBalance(userId: string) {
    // 1. Obtener datos del empleado
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, hireDate: true }
    });

    if (!employee) throw new Error('Empleado no encontrado');

    // 2. Calcular días GANADOS (Devengados)
    // Regla: 30 días por año = 2.5 días por mes completo trabajado
    const today = new Date();
    const monthsWorked = this.monthDiff(employee.hireDate, today);
    const daysEarned = monthsWorked * 2.5;

    // 3. Calcular días USADOS (Gozados)
    // Sumamos todas las solicitudes de VACACIONES que estén APROBADAS
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
        // +1 porque si pides del 1 al 1, es 1 día.
        const days = this.daysDiff(req.startDate, req.endDate) + 1; 
        daysUsed += days;
      }
    });

    // 4. Saldo Disponible
    const balance = daysEarned - daysUsed;

    return {
      hireDate: employee.hireDate,
      monthsWorked,
      daysEarned,
      daysUsed,
      balance: parseFloat(balance.toFixed(2)) // Redondeo a 2 decimales
    };
  }

  // --- Helpers de Fecha (Sin librerías externas para no complicarte) ---
  private monthDiff(d1: Date, d2: Date): number {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    // Ajuste por días: si no ha cerrado el mes, no cuenta
    if (d2.getDate() < d1.getDate()) { 
        months--; 
    }
    return months <= 0 ? 0 : months;
  }

  private daysDiff(start: Date, end: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // horas*min*seg*ms
    return Math.round(Math.abs((start.getTime() - end.getTime()) / oneDay));
  }
}