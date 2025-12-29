import { prisma } from '../../config/prisma';
import { EmployeeStatus, SystemRole, DocumentType } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware';
import * as argon2 from 'argon2';
import { StorageService } from '../../shared/services/storage.service';

// --- HELPERS ---

/**
 * Genera la URL pública para ver la imagen en el navegador.
 * Solo funciona para archivos en el contenedor 'public-assets'.
 */
const getPublicUrl = (path: string) => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) return null;
  return `https://${accountName}.blob.core.windows.net/public-assets/${path}`;
};

// --- DTOs ---

interface CreateEmployeeDTO {
  email: string;
  firstName: string;
  lastName: string;
  documentId: string;
  hireDate: string | Date;
  role?: SystemRole;
  birthDate?: string | Date;
  departmentId?: string;
  positionId?: string;
  supervisorId?: string;
}

export class EmployeesService {
  private storageService = new StorageService();

  // ==========================================
  // 1. CREAR EMPLEADO (Transacción Atómica)
  // ==========================================
  async createEmployee(data: CreateEmployeeDTO, tenantId: string) {
    // A. Validaciones de Unicidad
    const existingEmail = await prisma.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId } }
    });
    if (existingEmail) throw new AppError('El correo ya está registrado en esta empresa', 409);

    const existingDoc = await prisma.employee.findUnique({
      where: { documentId_tenantId: { documentId: data.documentId, tenantId } }
    });
    if (existingDoc) throw new AppError('El documento de identidad ya existe en esta empresa', 409);

    // B. Validar Referencias
    if (data.departmentId) await this.validateBelongsToTenant('department', data.departmentId, tenantId);
    if (data.positionId) await this.validateBelongsToTenant('position', data.positionId, tenantId);
    if (data.supervisorId) await this.validateBelongsToTenant('employee', data.supervisorId, tenantId);

    // C. Generar Contraseña Temporal
    const tempPassword = `${data.firstName.charAt(0)}${data.lastName}123!`.trim();
    const passwordHash = await argon2.hash(tempPassword);

    // D. Transacción
    return await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role || SystemRole.USER,
          tenantId,
          isActive: true
        }
      });

      const newEmployee = await tx.employee.create({
        data: {
          userId: newUser.id,
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          documentId: data.documentId,
          hireDate: new Date(data.hireDate),
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          status: EmployeeStatus.ACTIVE,
          departmentId: data.departmentId,
          positionId: data.positionId,
          supervisorId: data.supervisorId
        }
      });

      return { user: newUser, employee: newEmployee, tempPassword };
    });
  }

  // ==========================================
  // 2. OBTENER UN EMPLEADO (Con Foto)
  // ==========================================
  async getEmployeeById(id: string, tenantId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id, tenantId }, // Importante: Filtrar por tenantId por seguridad
      include: {
        department: true,
        position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        // Incluimos solo el Avatar más reciente
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true } // Solo necesitamos el path
        }
      }
    });

    if (!employee) throw new AppError('Empleado no encontrado', 404);

    // Transformación: Agregamos 'photoUrl' y limpiamos el array 'documents'
    const avatarPath = employee.documents[0]?.path;
    const { documents, ...employeeData } = employee; // Sacamos documents del objeto final

    return {
      ...employeeData,
      photoUrl: avatarPath ? getPublicUrl(avatarPath) : null
    };
  }

  // ==========================================
  // 3. DIRECTORIO COMPLETO (Con Fotos)
  // ==========================================
  async getAllEmployees(tenantId: string) {
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        // Traemos también el avatar para la lista
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });

    // Mapeamos para agregar photoUrl a cada empleado de la lista
    return employees.map(emp => {
      const avatarPath = emp.documents[0]?.path;
      const { documents, ...rest } = emp;
      return {
        ...rest,
        photoUrl: avatarPath ? getPublicUrl(avatarPath) : null
      };
    });
  }

  // ==========================================
  // 4. ASIGNACIÓN (Update Admin Data)
  // ==========================================
  async assignAdministrativeData(employeeId: string, data: any, tenantId: string) {
    const { departmentId, positionId, supervisorId, contractType } = data;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) {
      throw new AppError('Empleado no encontrado en esta organización', 404);
    }

    if (supervisorId && supervisorId === employeeId) {
      throw new AppError('Un colaborador no puede ser su propio supervisor', 400);
    }

    if (departmentId) await this.validateBelongsToTenant('department', departmentId, tenantId);
    if (positionId) await this.validateBelongsToTenant('position', positionId, tenantId);
    if (supervisorId) await this.validateBelongsToTenant('employee', supervisorId, tenantId);

    return await prisma.employee.update({
      where: { id: employeeId },
      data: {
        departmentId: departmentId || null,
        positionId: positionId || null,
        supervisorId: supervisorId || null,
        contractType: contractType
      },
      include: { department: true, position: true, supervisor: true }
    });
  }

  // ==========================================
  // 5. SUBIR FOTO DE PERFIL (Avatar)
  // ==========================================
  async uploadAvatar(employeeId: string, file: Express.Multer.File, tenantId: string, userId: string) {
    // 1. Validar existencia
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) {
      throw new AppError('Empleado no encontrado o no pertenece a esta organización', 404);
    }

    // 2. Subir a Azure (Contenedor PÚBLICO)
    const uploadResult = await this.storageService.uploadFile(
      file,
      'public-assets', 
      `tenants/${tenantId}/${employeeId}/avatar`
    );

    // 3. Registrar en BD
    const newDoc = await prisma.document.create({
      data: {
        tenantId,
        employeeId,
        name: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        path: uploadResult.path,
        type: DocumentType.AVATAR,
        isPublic: true,
        uploadedBy: userId
      }
    });

    // 4. Retornar el documento con la URL ya procesada para que el front la use al instante
    return {
      ...newDoc,
      photoUrl: getPublicUrl(newDoc.path)
    };
  }

  // ==========================================
  // 6. MI EQUIPO & BUSCADOR
  // ==========================================
  async getMyTeamContext(userId: string, tenantId: string) {
    const me = await prisma.employee.findFirst({
      where: { userId, tenantId },
      include: {
        supervisor: { include: { position: true, user: { select: { email: true } } } },
        position: true
      }
    });

    if (!me) throw new AppError('Perfil de empleado no encontrado', 404);

    // Se podrían agregar photos a peers y subordinates usando la misma lógica del map
    let peers: any[] = [];
    if (me.supervisorId) {
      peers = await prisma.employee.findMany({
        where: { supervisorId: me.supervisorId, id: { not: me.id }, tenantId, status: 'ACTIVE' },
        include: { position: true, user: { select: { email: true } } }
      });
    }

    const subordinates = await prisma.employee.findMany({
      where: { supervisorId: me.id, tenantId, status: 'ACTIVE' },
      include: { position: true, user: { select: { email: true } } }
    });

    return { me, supervisor: me.supervisor, peers, subordinates };
  }

  async searchEmployees(query: string, tenantId: string) {
    return await prisma.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: { select: { name: true } },
        department: { select: { name: true } }
      }
    });
  }

  // --- PRIVATE HELPERS ---
  
  private async validateBelongsToTenant(model: 'department' | 'position' | 'employee', id: string, tenantId: string) {
    let record;
    if (model === 'department') record = await prisma.department.findUnique({ where: { id } });
    if (model === 'position') record = await prisma.position.findUnique({ where: { id } });
    if (model === 'employee') record = await prisma.employee.findUnique({ where: { id } });

    if (!record) throw new AppError(`${model} no encontrado`, 404);
    
    // @ts-ignore
    if (record.tenantId !== tenantId) {
      throw new AppError(`El ${model} seleccionado no pertenece a esta empresa`, 403);
    }
  }





  async uploadDocument(
    employeeId: string, 
    file: Express.Multer.File, 
    type: DocumentType, // CONTRACT, ID_CARD, MEDICAL, etc.
    tenantId: string, 
    userId: string
  ) {
    // 1. Validar empleado
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) {
      throw new AppError('Empleado no encontrado', 404);
    }

    // 2. Subir a Azure (Contenedor PRIVADO)
    // Ruta: tenants/{tenantId}/{employeeId}/docs/{uuid}.pdf
    const uploadResult = await this.storageService.uploadFile(
      file,
      'private-docs', // <--- CAJA FUERTE 🔒
      `tenants/${tenantId}/${employeeId}/docs`
    );

    // 3. Registrar en BD
    const newDoc = await prisma.document.create({
      data: {
        tenantId,
        employeeId,
        name: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        path: uploadResult.path,
        type: type,
        isPublic: false, // <--- PRIVADO
        uploadedBy: userId
      }
    });

    return newDoc;
  }

  // ==========================================
  // 8. OBTENER URL DE DOCUMENTO (Generar Link Temporal)
  // ==========================================
  async getDocumentLink(documentId: string, tenantId: string) {
    // 1. Buscar el documento en la BD
    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!doc || doc.tenantId !== tenantId) {
      throw new AppError('Documento no encontrado', 404);
    }

    // 2. Generar URL
    if (doc.isPublic) {
      // Si es público (Avatar), usamos la URL simple
      return getPublicUrl(doc.path);
    } else {
      // Si es privado (Contrato), generamos URL firmada (SAS)
      // Válida por 60 minutos
      return this.storageService.getSignedUrl('private-docs', doc.path, 60);
    }
  }


}