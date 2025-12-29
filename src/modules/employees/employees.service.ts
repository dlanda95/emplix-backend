import { prisma } from '../../config/prisma';
import { EmployeeStatus, SystemRole, DocumentType } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware';
import * as argon2 from 'argon2';
import { StorageService } from '../../shared/services/storage.service';

// --- GLOBAL HELPERS ---

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
  // 1. CREAR EMPLEADO
  // ==========================================
  async createEmployee(data: CreateEmployeeDTO, tenantId: string) {
    // A. Validaciones
    const existingEmail = await prisma.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId } }
    });
    if (existingEmail) throw new AppError('El correo ya está registrado', 409);

    const existingDoc = await prisma.employee.findUnique({
      where: { documentId_tenantId: { documentId: data.documentId, tenantId } }
    });
    if (existingDoc) throw new AppError('El documento de identidad ya existe', 409);

    if (data.departmentId) await this.validateBelongsToTenant('department', data.departmentId, tenantId);
    if (data.positionId) await this.validateBelongsToTenant('position', data.positionId, tenantId);
    if (data.supervisorId) await this.validateBelongsToTenant('employee', data.supervisorId, tenantId);

    // B. Contraseña Temporal
    const tempPassword = `${data.firstName.charAt(0)}${data.lastName}123!`.trim();
    const passwordHash = await argon2.hash(tempPassword);

    // C. Transacción
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
  // 2. LECTURA DE DATOS (Con Avatares)
  // ==========================================

  async getEmployeeById(id: string, tenantId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id, tenantId },
      include: {
        department: true,
        position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        // Traemos el avatar para procesarlo
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        }
      }
    });

    if (!employee) throw new AppError('Empleado no encontrado', 404);

    // Usamos el helper privado para limpiar la respuesta
    return this.transformWithAvatar(employee);
  }

  async getAllEmployees(tenantId: string) {
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        }
      },
      orderBy: { lastName: 'asc' }
    });

    return employees.map(emp => this.transformWithAvatar(emp));
  }

  async searchEmployees(query: string, tenantId: string) {
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: tenantId,
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
        department: { select: { name: true } },
        // Incluimos documento para mostrar miniatura en el buscador
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        }
      }
    });

    return employees.map(emp => this.transformWithAvatar(emp));
  }

  async getMyTeamContext(userId: string, tenantId: string) {
    // 1. MI PERFIL
    const me = await prisma.employee.findFirst({
      where: { userId, tenantId },
      include: {
        supervisor: { include: { position: true, user: { select: { email: true } } } },
        position: true,
        documents: { where: { type: DocumentType.AVATAR }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } }
      }
    });

    if (!me) throw new AppError('Perfil no encontrado', 404);

    const commonInclude = {
      position: true,
      user: { select: { email: true } },
      documents: { where: { type: DocumentType.AVATAR }, take: 1, orderBy: { createdAt: 'desc' as const }, select: { path: true } }
    };

    // 2. COMPAÑEROS (Peers)
    let peers: any[] = [];
    if (me.supervisorId) {
      const rawPeers = await prisma.employee.findMany({
        where: { supervisorId: me.supervisorId, id: { not: me.id }, tenantId, status: 'ACTIVE' },
        include: commonInclude
      });
      peers = rawPeers.map(p => this.transformWithAvatar(p));
    }

    // 3. SUBORDINADOS
    const rawSubordinates = await prisma.employee.findMany({
      where: { supervisorId: me.id, tenantId, status: 'ACTIVE' },
      include: commonInclude
    });
    const subordinates = rawSubordinates.map(s => this.transformWithAvatar(s));

    return { 
      me: this.transformWithAvatar(me), 
      supervisor: me.supervisor, // El supervisor ya viene anidado en 'me', pero se puede pasar aparte
      peers, 
      subordinates 
    };
  }

  // ==========================================
  // 3. GESTIÓN ADMINISTRATIVA
  // ==========================================
  async assignAdministrativeData(employeeId: string, data: any, tenantId: string) {
    const { departmentId, positionId, supervisorId, contractType } = data;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) throw new AppError('Empleado no encontrado', 404);

    if (supervisorId && supervisorId === employeeId) throw new AppError('Auto-supervisión no permitida', 400);

    if (departmentId) await this.validateBelongsToTenant('department', departmentId, tenantId);
    if (positionId) await this.validateBelongsToTenant('position', positionId, tenantId);
    if (supervisorId) await this.validateBelongsToTenant('employee', supervisorId, tenantId);

    return await prisma.employee.update({
      where: { id: employeeId },
      data: { departmentId, positionId, supervisorId, contractType },
      include: { department: true, position: true, supervisor: true }
    });
  }

  // ==========================================
  // 4. STORAGE: AVATARES (Público - Lógica Única)
  // ==========================================
  async uploadAvatar(employeeId: string, file: Express.Multer.File, tenantId: string, userId: string) {
    // A. Validar
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) throw new AppError('Empleado no encontrado', 404);

    // B. LIMPIEZA: Buscar avatar anterior
    const oldAvatar = await prisma.document.findFirst({
      where: { employeeId, type: DocumentType.AVATAR }
    });

    // C. Si existe, BORRAR de Azure y BD
    if (oldAvatar) {
      await this.storageService.deleteFile('public-assets', oldAvatar.path);
      await prisma.document.delete({ where: { id: oldAvatar.id } });
    }

    // D. SUBIDA NUEVA
    const uploadResult = await this.storageService.uploadFile(
      file, 
      'public-assets', 
      `tenants/${tenantId}/${employeeId}/avatar`
    );

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

    return {
      ...newDoc,
      photoUrl: getPublicUrl(newDoc.path)
    };
  }

  // ==========================================
  // 5. STORAGE: DOCUMENTOS PRIVADOS (Contratos)
  // ==========================================
  async uploadDocument(
    employeeId: string, 
    file: Express.Multer.File, 
    type: DocumentType, 
    tenantId: string, 
    userId: string
  ) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) throw new AppError('Empleado no encontrado', 404);

    const uploadResult = await this.storageService.uploadFile(
      file,
      'private-docs', 
      `tenants/${tenantId}/${employeeId}/docs`
    );

    return await prisma.document.create({
      data: {
        tenantId,
        employeeId,
        name: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        path: uploadResult.path,
        type: type,
        isPublic: false,
        uploadedBy: userId
      }
    });
  }

  async getDocumentLink(documentId: string, tenantId: string) {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });

    if (!doc || doc.tenantId !== tenantId) throw new AppError('Documento no encontrado', 404);

    if (doc.isPublic) {
      return getPublicUrl(doc.path);
    } else {
      // SAS Token válido por 60 min
      return this.storageService.getSignedUrl('private-docs', doc.path, 60);
    }
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================
  
  /**
   * Transforma un objeto empleado crudo (con documentos anidados)
   * a un objeto limpio con 'photoUrl' y sin el array 'documents'.
   */
  private transformWithAvatar(employee: any) {
    if (!employee) return null;
    
    // Intentamos sacar el primer documento (asumimos que la query ya filtró por AVATAR)
    const avatarDoc = employee.documents && employee.documents.length > 0 ? employee.documents[0] : null;
    
    // Eliminamos 'documents' del objeto final para no ensuciar el JSON
    const { documents, ...rest } = employee;

    return {
      ...rest,
      photoUrl: avatarDoc ? getPublicUrl(avatarDoc.path) : null
    };
  }

  private async validateBelongsToTenant(model: 'department' | 'position' | 'employee', id: string, tenantId: string) {
    let record;
    if (model === 'department') record = await prisma.department.findUnique({ where: { id } });
    if (model === 'position') record = await prisma.position.findUnique({ where: { id } });
    if (model === 'employee') record = await prisma.employee.findUnique({ where: { id } });

    if (!record) throw new AppError(`${model} no encontrado`, 404);
    
    // @ts-ignore
    if (record.tenantId !== tenantId) throw new AppError(`El registro no pertenece a esta empresa`, 403);
  }



// ==========================================
  // X. OBTENER MI PERFIL (Endpoint /me)
  // ==========================================
  async getMyProfile(userId: string, tenantId: string) {
    // Buscamos al empleado conectado al usuario actual
    const employee = await prisma.employee.findFirst({
      where: { 
        userId: userId, 
        tenantId: tenantId 
      },
      include: {
        department: true,
        position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        // Incluimos el avatar (¡Misma lógica que usaste antes!)
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' as const },
          select: { path: true }
        }
      }
    });

    if (!employee) throw new AppError('Perfil de empleado no encontrado', 404);

    // Reutilizamos tu helper existente para formatear la URL
    return this.transformWithAvatar(employee);
  }


  

}