import path from 'path';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import * as argon2 from 'argon2';
import { StorageService } from '../../shared/services/storage.service';
import { CreateEmployeeDto, AssignAdminDataDto, TimelineEventDto } from './employees.dto';

const getPublicUrl = (blobPath: string) => {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  return account ? `https://${account}.blob.core.windows.net/public-assets/${blobPath}` : null;
};

export class EmployeesService {
  private storageService = new StorageService();

  // ── Crear Empleado ──────────────────────────────────────────────────────────
  async createEmployee(data: CreateEmployeeDto, _tenantSlug: string, db: PrismaClient) {
    if (data.documentId) {
      const existingDoc = await db.employee.findUnique({ where: { documentId: data.documentId } });
      if (existingDoc) throw new AppError('El documento de identidad ya existe', 409);
    }

    if (data.departmentId) await this.validateExists('department', data.departmentId, db);
    if (data.positionId)   await this.validateExists('position',   data.positionId,   db);
    if (data.supervisorId) await this.validateExists('employee',   data.supervisorId,  db);

    const contractType = data.contractTypeId
      ? await db.contractType.findUnique({ where: { id: data.contractTypeId } })
      : await db.contractType.findFirst();
    const workShift = data.workShiftId
      ? await db.workShift.findUnique({ where: { id: data.workShiftId } })
      : await db.workShift.findFirst();

    if (!contractType || !workShift) {
      throw new AppError('Configura al menos un Tipo de Contrato y un Turno antes de crear empleados.', 500);
    }

    const grantAccess = data.grantAccess !== false;

    if (grantAccess) {
      const existingEmail = await db.user.findUnique({ where: { email: data.email } });
      if (existingEmail) throw new AppError('El correo ya está registrado', 409);
    }

    const tempPassword = `${data.firstName.charAt(0)}${data.lastName}123!`.trim();

    return db.$transaction(async (tx) => {
      let userId: string | undefined;

      if (grantAccess) {
        const passwordHash = await argon2.hash(tempPassword);
        const newUser = await tx.user.create({
          data: { email: data.email, passwordHash, role: data.role ?? 'EMPLOYEE', isActive: true },
        });
        userId = newUser.id;
      }

      const newEmployee = await tx.employee.create({
        data: {
          userId,
          firstName:    data.firstName,
          lastName:     data.lastName,
          documentId:   data.documentId,
          hireDate:     new Date(data.hireDate),
          birthDate:    data.birthDate ? new Date(data.birthDate) : null,
          status:       'ACTIVE',
          departmentId: data.departmentId,
          positionId:   data.positionId,
          supervisorId: data.supervisorId,
          laborData: {
            create: {
              contractTypeId: contractType.id,
              workShiftId:    workShift.id,
              hierarchyLevel: 'OPERATIVO',
              startDate:      new Date(data.hireDate),
              salary:         data.salary ?? 0,
            },
          },
        },
      });

      return {
        employee:    newEmployee,
        grantAccess,
        ...(grantAccess && { email: data.email, tempPassword }),
      };
    });
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────
  async getEmployeeById(id: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        department: true,
        position:   true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user:       { select: { email: true, role: true, isActive: true } },
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
        laborData:  { include: { contractType: true, workShift: true } },
      },
    });
    if (!employee) throw new AppError('Empleado no encontrado', 404);
    return this.transformWithAvatar(employee);
  }

  async getAllEmployees(
    db: PrismaClient,
    params: { page?: number; limit?: number; search?: string; departmentId?: string } = {},
  ) {
    const page  = Math.max(1, Number(params.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip  = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { documentId:{ contains: q, mode: 'insensitive' } },
      ];
    }

    const include = {
      department: { select: { id: true, name: true, code: true } },
      position:   { select: { id: true, name: true } },
      supervisor: { select: { id: true, firstName: true, lastName: true } },
      user:       { select: { email: true, role: true, isActive: true } },
      laborData:  true,
      documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
    };

    const [total, employees] = await db.$transaction([
      db.employee.count({ where }),
      db.employee.findMany({ where, include, orderBy: { lastName: 'asc' }, skip, take: limit }),
    ]);

    return {
      data:       employees.map(e => this.transformWithAvatar(e)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchEmployees(query: string, db: PrismaClient) {
    const employees = await db.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName:  { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true, firstName: true, lastName: true,
        position:  { select: { name: true } },
        department: { select: { name: true } },
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
      },
    });
    return employees.map(e => this.transformWithAvatar(e));
  }

  // ── Perfil propio ───────────────────────────────────────────────────────────
  private static readonly SELF_UPDATABLE = new Set([
    'personalEmail', 'phone', 'cellPhone',
    'address', 'district', 'province', 'departmentdirec', 'addressRef',
    'emergencyName', 'emergencyPhone', 'emergencyRel',
    'afpType', 'afpEntity', 'afpCommission',
    'bankEntity', 'bankAccount', 'bankCci',
  ]);

  async updateMyProfile(userId: string, data: Record<string, unknown>, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (EmployeesService.SELF_UPDATABLE.has(key)) patch[key] = value ?? null;
    }
    if (Object.keys(patch).length === 0) throw new AppError('Sin campos válidos', 400);

    const updated = await db.employee.update({
      where: { userId },
      data:  patch,
      include: {
        department: true, position: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user:       { select: { email: true, role: true, isActive: true } },
        laborData:  { include: { contractType: true, workShift: true } },
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' as const }, select: { path: true } },
      },
    });
    return this.transformWithAvatar(updated);
  }

  async getMyProfile(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({
      where: { userId },
      include: {
        department: true,
        position:   true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        user:       { select: { email: true, role: true, isActive: true } },
        laborData:  { include: { contractType: true, workShift: true } },
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' as const }, select: { path: true } },
      },
    });
    if (!employee) throw new AppError('Perfil no encontrado', 404);
    return this.transformWithAvatar(employee);
  }

  async getMyTeamContext(userId: string, db: PrismaClient) {
    const me = await db.employee.findUnique({
      where: { userId },
      include: {
        supervisor: { include: { position: true, user: { select: { email: true } } } },
        position:   true,
        documents:  { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
      },
    });
    if (!me) throw new AppError('Perfil no encontrado', 404);

    const commonInclude = {
      position:  true,
      user:      { select: { email: true } },
      documents: { where: { type: 'AVATAR' as const }, take: 1, orderBy: { createdAt: 'desc' as const }, select: { path: true } },
    };

    const peers = me.supervisorId
      ? (await db.employee.findMany({ where: { supervisorId: me.supervisorId, id: { not: me.id }, status: 'ACTIVE' }, include: commonInclude })).map(p => this.transformWithAvatar(p))
      : [];

    const subordinates = (await db.employee.findMany({ where: { supervisorId: me.id, status: 'ACTIVE' }, include: commonInclude })).map(s => this.transformWithAvatar(s));

    return { me: this.transformWithAvatar(me), supervisor: me.supervisor, peers, subordinates };
  }

  // ── Gestión administrativa ──────────────────────────────────────────────────
  async assignAdministrativeData(employeeId: string, data: AssignAdminDataDto, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    if (data.supervisorId && data.supervisorId === employeeId) throw new AppError('Auto-supervisión no permitida', 400);
    if (data.departmentId) await this.validateExists('department', data.departmentId, db);
    if (data.positionId)   await this.validateExists('position',   data.positionId,   db);
    if (data.supervisorId) await this.validateExists('employee',   data.supervisorId,  db);

    return db.$transaction(async (tx) => {
      let updatedEmployee = employee;
      if (data.departmentId !== undefined || data.positionId !== undefined || data.supervisorId !== undefined) {
        updatedEmployee = await tx.employee.update({
          where: { id: employeeId },
          data:  { departmentId: data.departmentId, positionId: data.positionId, supervisorId: data.supervisorId },
          include: { department: true, position: true, supervisor: true },
        });
      }

      if (data.contractType || data.workShiftId || data.salary !== undefined) {
        const defaultDate = data.startDate ? new Date(data.startDate) : new Date();
        await tx.employeeLaborData.upsert({
          where:  { employeeId },
          create: {
            employeeId,
            contractTypeId: data.contractType!,
            workShiftId:    data.workShiftId!,
            salary:         data.salary ?? 0,
            hierarchyLevel: 'OPERATIVO',
            startDate:      defaultDate,
          },
          update: {
            ...(data.contractType  && { contractTypeId: data.contractType }),
            ...(data.workShiftId   && { workShiftId: data.workShiftId }),
            ...(data.salary !== undefined && { salary: data.salary }),
            ...(data.startDate     && { startDate: new Date(data.startDate) }),
          },
        });
      }

      return updatedEmployee;
    });
  }

  // ── Storage ─────────────────────────────────────────────────────────────────
  async uploadAvatar(employeeId: string, file: Express.Multer.File, tenantSlug: string, userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const oldAvatar = await db.document.findFirst({ where: { employeeId, type: 'AVATAR' } });
    if (oldAvatar) {
      await this.storageService.deleteFile('public-assets', oldAvatar.path);
      await db.document.delete({ where: { id: oldAvatar.id } });
    }

    const upload = await this.storageService.uploadFile(file, 'public-assets', `tenants/${tenantSlug}/${employeeId}/avatar`);

    const doc = await db.document.create({
      data: {
        employeeId,
        name:         upload.originalName,
        mimeType:     upload.mimeType,
        size:         upload.size,
        path:         upload.path,
        type:         'AVATAR',
        isPublic:     true,
        uploadedBy:   userId,
      },
    });

    return { ...doc, photoUrl: getPublicUrl(doc.path) };
  }

  async uploadDocument(employeeId: string, file: Express.Multer.File, type: any, tenantSlug: string, userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404);

    const upload = await this.storageService.uploadFile(file, 'private-docs', `tenants/${tenantSlug}/${employeeId}/docs`);

    return db.document.create({
      data: {
        employeeId,
        name:       upload.originalName,
        mimeType:   upload.mimeType,
        size:       upload.size,
        path:       upload.path,
        type,
        isPublic:   false,
        uploadedBy: userId,
      },
    });
  }

  async getEmployeeDocuments(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');
    return db.document.findMany({ where: { employeeId: employee.id, type: { not: 'AVATAR' } }, orderBy: { createdAt: 'desc' } });
  }

  async uploadMyDocument(userId: string, file: Express.Multer.File, type: any, tenantSlug: string, db: PrismaClient, label?: string) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');

    const ext       = path.extname(file.originalname).toLowerCase();
    const norm      = (s: string) =>
      s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    const lastName  = norm(employee.lastName);
    const firstName = norm(employee.firstName);
    const prefix    = (label || String(type)).toUpperCase().replace(/[^A-Z0-9_]/g, '');

    const isIdentity = prefix === 'DNI_CE' || String(type).toUpperCase() === 'ID_CARD';
    const docId      = norm(employee.documentId ?? '');
    const strategicName = isIdentity
      ? `${prefix}_${docId}_${lastName}_${firstName}${ext}`
      : `${prefix}_${lastName}_${firstName}${ext}`;

    console.log('[uploadMyDocument] label=%s type=%s prefix=%s strategicName=%s originalname=%s',
      label, type, prefix, strategicName, file.originalname);

    const folder = `tenants/${tenantSlug}/${employee.id}/docs/${String(type).toLowerCase()}`;
    const upload  = await this.storageService.uploadFile(file, 'private-docs', folder, strategicName);

    return db.document.create({
      data: {
        employeeId:   employee.id,
        name:         strategicName,
        originalName: file.originalname,
        mimeType:     file.mimetype,
        size:         file.size,
        path:         upload.path,
        type,
        isPublic:     false,
        uploadedBy:   userId,
      },
    });
  }

  async deleteEmployeeDocument(documentId: string, userId: string, db: PrismaClient): Promise<void> {
    const doc = await db.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError('Documento no encontrado', 404);

    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee || doc.employeeId !== employee.id) throw new AppError('No tienes permiso para eliminar este documento', 403, 'FORBIDDEN');

    await this.storageService.deleteFile('private-docs', doc.path);
    await db.document.delete({ where: { id: documentId } });
  }

  async getDocumentLink(documentId: string, db: PrismaClient) {
    const doc = await db.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new AppError('Documento no encontrado', 404);
    return doc.isPublic ? getPublicUrl(doc.path) : this.storageService.getSignedUrl('private-docs', doc.path, 60);
  }

  // ── Historial laboral ───────────────────────────────────────────────────────
  async getEmploymentHistory(userId: string, db: PrismaClient): Promise<TimelineEventDto[]> {
    const employee = await db.employee.findUnique({
      where: { userId },
      include: {
        department:  { select: { name: true } },
        position:    { select: { name: true } },
        supervisor:  { select: { firstName: true, lastName: true } },
        laborData: { include: { contractType: { select: { name: true } }, workShift: { select: { name: true } } } },
      },
    });
    if (!employee) throw new AppError('Empleado no encontrado', 404, 'EMPLOYEE_NOT_FOUND');

    const events: TimelineEventDto[] = [];

    events.push({
      id: `hire-${employee.id}`, type: 'contratacion', date: employee.hireDate.toISOString(),
      title: 'Incorporación a la empresa', icon: 'how_to_reg', isCurrent: false,
      details: [
        ...(employee.position?.name   ? [{ label: 'Puesto inicial', value: employee.position.name   }] : []),
        ...(employee.department?.name ? [{ label: 'Área inicial',   value: employee.department.name }] : []),
      ],
    });

    const labor = employee.laborData;
    if (labor) {
      const diffDays = Math.abs(labor.startDate.getTime() - employee.hireDate.getTime()) / 86_400_000;
      if (diffDays > 1) {
        events.push({
          id: `labor-${employee.id}`, type: 'cambio-contrato', date: labor.startDate.toISOString(),
          title: 'Actualización de condiciones laborales', icon: 'description', isCurrent: false,
          details: [
            ...(labor.contractType?.name ? [{ label: 'Contrato', value: labor.contractType.name }] : []),
            ...(labor.workShift?.name    ? [{ label: 'Turno',    value: labor.workShift.name    }] : []),
            ...(labor.hierarchyLevel     ? [{ label: 'Nivel',    value: labor.hierarchyLevel    }] : []),
            ...(Number(labor.salary) > 0 ? [{ label: 'Salario',  value: `$${Number(labor.salary).toLocaleString('es-PE')}` }] : []),
          ],
        });
      }
    }

    const currentDetails: TimelineEventDto['details'] = [
      ...(employee.position?.name   ? [{ label: 'Puesto',    value: employee.position.name   }] : []),
      ...(employee.department?.name ? [{ label: 'Área',      value: employee.department.name }] : []),
      ...(employee.supervisor ? [{ label: 'Supervisor', value: `${employee.supervisor.firstName} ${employee.supervisor.lastName}` }] : []),
      ...(labor?.contractType?.name ? [{ label: 'Contrato', value: labor.contractType.name }] : []),
      ...(labor?.workShift?.name    ? [{ label: 'Turno',    value: labor.workShift.name    }] : []),
    ];

    if (currentDetails.length > 0) {
      events.push({
        id: `current-${employee.id}`, type: 'estado-actual', date: new Date().toISOString(),
        title: 'Estado actual', icon: 'verified_user', isCurrent: true,
        details: currentDetails,
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  private transformWithAvatar(employee: any) {
    if (!employee) return null;
    const avatarDoc = employee.documents?.[0];
    const { documents, ...rest } = employee;
    return { ...rest, photoUrl: avatarDoc ? getPublicUrl(avatarDoc.path) : null };
  }

  private async validateExists(model: 'department' | 'position' | 'employee', id: string, db: PrismaClient): Promise<void> {
    let record: any = null;
    if (model === 'department') record = await db.department.findUnique({ where: { id } });
    if (model === 'position')   record = await db.position.findUnique({ where: { id } });
    if (model === 'employee')   record = await db.employee.findUnique({ where: { id } });
    if (!record) throw new AppError(`${model} no encontrado`, 404);
  }
}
