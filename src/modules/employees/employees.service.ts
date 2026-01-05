import { prisma } from '../../config/prisma';
import { EmployeeStatus, SystemRole, DocumentType } from '@prisma/client';
import { AppError } from '../../shared/middlewares/error.middleware';
import * as argon2 from 'argon2';
import { StorageService } from '../../shared/services/storage.service';
import { CreateEmployeeDTO, AssignAdminDataDTO } from './employees.interface';

const getPublicUrl = (path: string) => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) return null;
  return `https://${accountName}.blob.core.windows.net/public-assets/${path}`;
};

export class EmployeesService {
  private storageService = new StorageService();

  // ==========================================
  // 1. CREAR EMPLEADO (Con Kit Laboral Inicial)
  // ==========================================
  async createEmployee(data: CreateEmployeeDTO, tenantId: string) {
    // A. Validaciones previas
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

    // B. Obtener Defaults para Datos Laborales (Robustez)
    // Buscamos el primer contrato y turno disponibles en la empresa para no fallar
    const defaultContract = await prisma.contractType.findFirst({ where: { tenantId } });
    const defaultShift = await prisma.workShift.findFirst({ where: { tenantId } });

    if (!defaultContract || !defaultShift) {
      throw new AppError('La empresa no tiene Tipos de Contrato o Turnos configurados. Ejecuta el Seed o créalos.', 500);
    }

    // C. Contraseña Temporal
    const tempPassword = `${data.firstName.charAt(0)}${data.lastName}123!`.trim();
    const passwordHash = await argon2.hash(tempPassword);

    // D. Transacción de Creación
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
          supervisorId: data.supervisorId,
          
          // 🔥 NUEVO: Crear Ficha Laboral Automática
          laborData: {
            create: {
              contractTypeId: defaultContract.id,
              workShiftId: defaultShift.id,
              hierarchyLevel: 'OPERATIVO', // Default
              startDate: new Date(data.hireDate),
              salary: 0 // Se define luego
            }
          }
        }
      });

      return { user: newUser, employee: newEmployee, tempPassword };
    });
  }

  // ==========================================
  // 2. LECTURA DE DATOS
  // ==========================================

  async getEmployeeById(id: string, tenantId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id, tenantId },
      include: {
        department: true,
        position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        },
        // 🔥 Incluimos Datos Laborales
        laborData: {
          include: { contractType: true, workShift: true }
        }
      }
    });

    if (!employee) throw new AppError('Empleado no encontrado', 404);
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

        // 👇 ¡ESTO ES LO QUE FALTABA!
        laborData: true,
        
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { path: true }
        },
        // Opcional: incluir laborData si se necesita en la lista
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

  // ==========================================
  // 3. CONTEXTO PERSONAL
  // ==========================================

  async getMyProfile(userId: string, tenantId: string) {
    const employee = await prisma.employee.findFirst({
      where: { userId, tenantId },
      include: {
        department: true,
        position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user: { select: { email: true, role: true, isActive: true } },
        laborData: { include: { contractType: true, workShift: true } }, // 🔥 Info vital para el empleado
        documents: {
          where: { type: DocumentType.AVATAR },
          take: 1,
          orderBy: { createdAt: 'desc' as const },
          select: { path: true }
        }
      }
    });

    if (!employee) throw new AppError('Perfil de empleado no encontrado', 404);
    return this.transformWithAvatar(employee);
  }

  async getMyTeamContext(userId: string, tenantId: string) {
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

    let peers: any[] = [];
    if (me.supervisorId) {
      const rawPeers = await prisma.employee.findMany({
        where: { supervisorId: me.supervisorId, id: { not: me.id }, tenantId, status: 'ACTIVE' },
        include: commonInclude
      });
      peers = rawPeers.map(p => this.transformWithAvatar(p));
    }

    const rawSubordinates = await prisma.employee.findMany({
      where: { supervisorId: me.id, tenantId, status: 'ACTIVE' },
      include: commonInclude
    });
    const subordinates = rawSubordinates.map(s => this.transformWithAvatar(s));

    return { 
      me: this.transformWithAvatar(me), 
      supervisor: me.supervisor, 
      peers, 
      subordinates 
    };
  }

  // ==========================================
  // 4. GESTIÓN ADMINISTRATIVA (CORREGIDO)
  // ==========================================
  async assignAdministrativeData(employeeId: string, data: AssignAdminDataDTO, tenantId: string) {
    // 1. Desestructuramos TODOS los campos (incluyendo los nuevos)
    const { 
      departmentId, 
      positionId, 
      supervisorId, 
      contractType, // Viene como string (UUID)
      workShiftId,
      salary,
      startDate
    } = data;

    // 2. Verificamos que el empleado exista
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) throw new AppError('Empleado no encontrado', 404);

    if (supervisorId && supervisorId === employeeId) throw new AppError('Auto-supervisión no permitida', 400);

    // 3. Validamos las FKs de estructura si vienen
    if (departmentId) await this.validateBelongsToTenant('department', departmentId, tenantId);
    if (positionId) await this.validateBelongsToTenant('position', positionId, tenantId);
    if (supervisorId) await this.validateBelongsToTenant('employee', supervisorId, tenantId);

    // 4. 🔥 TRANSACCIÓN DE 2 PASOS: Estructura + Laboral
    return await prisma.$transaction(async (tx) => {
      
      // PASO A: Actualizar Tabla Employee (Jefe, Área, Cargo)
      // Solo si viene algún dato de estructura, ejecutamos el update
      let updatedEmployee = employee;
      if (departmentId !== undefined || positionId !== undefined || supervisorId !== undefined) {
         updatedEmployee = await tx.employee.update({
          where: { id: employeeId },
          data: { 
            departmentId, 
            positionId, 
            supervisorId 
            // ⚠️ OJO: NO actualizamos contractType aquí, eso va en la otra tabla
          },
          include: { department: true, position: true, supervisor: true }
        });
      }

      // PASO B: Actualizar Tabla EmployeeLaborData (Sueldo, Turno, Contrato)
      // Usamos upsert: Si no existe ficha, la crea. Si existe, la actualiza.
      if (contractType || workShiftId || salary !== undefined) {
        
        // Valores por defecto para creación si faltan datos
        const defaultDate = startDate ? new Date(startDate) : new Date();

        await tx.employeeLaborData.upsert({
          where: { employeeId }, // La clave única es el empleado
          create: {
            employeeId,
            // Si es CREATE, estos campos son obligatorios. 
            // Asumimos que el front los manda o usamos defaults seguros.
            contractTypeId: contractType!, 
            workShiftId: workShiftId!,
            salary: salary || 0,
            hierarchyLevel: 'OPERATIVO',
            startDate: defaultDate
          },
          update: {
            // Si es UPDATE, solo actualizamos lo que llegó
            ...(contractType && { contractTypeId: contractType }),
            ...(workShiftId && { workShiftId: workShiftId }),
            ...(salary !== undefined && { salary: salary }),
            ...(startDate && { startDate: new Date(startDate) })
          }
        });
      }

      return updatedEmployee;
    });
  }

  // ==========================================
  // 5. STORAGE & ARCHIVOS
  // ==========================================
  async uploadAvatar(employeeId: string, file: Express.Multer.File, tenantId: string, userId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) throw new AppError('Empleado no encontrado', 404);

    const oldAvatar = await prisma.document.findFirst({
      where: { employeeId, type: DocumentType.AVATAR }
    });

    if (oldAvatar) {
      await this.storageService.deleteFile('public-assets', oldAvatar.path);
      await prisma.document.delete({ where: { id: oldAvatar.id } });
    }

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
      return this.storageService.getSignedUrl('private-docs', doc.path, 60);
    }
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================
  private transformWithAvatar(employee: any) {
    if (!employee) return null;
    const avatarDoc = employee.documents && employee.documents.length > 0 ? employee.documents[0] : null;
    const { documents, ...rest } = employee;
    return { ...rest, photoUrl: avatarDoc ? getPublicUrl(avatarDoc.path) : null };
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
}