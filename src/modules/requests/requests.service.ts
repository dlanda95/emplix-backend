import { prisma } from '../../config/prisma';
import { RequestType, RequestStatus } from '@prisma/client';

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




}