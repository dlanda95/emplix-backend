import * as argon2 from 'argon2';
import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import { CreateSystemUserDto, UpdateUserRoleDto, UpdateUserTypeDto } from './users.dto';

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const avatarUrl = (path: string) =>
  STORAGE_ACCOUNT ? `https://${STORAGE_ACCOUNT}.blob.core.windows.net/public-assets/${path}` : null;

export class UsersService {

  async listUsers(db: PrismaClient) {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        systemUserType: { select: { id: true, name: true, slug: true, color: true, permissions: true } },
        employee: {
          select: {
            id: true, firstName: true, lastName: true,
            position:   { select: { name: true } },
            department: { select: { name: true } },
            documents: { where: { type: 'AVATAR' }, take: 1, orderBy: { createdAt: 'desc' }, select: { path: true } },
          },
        },
      },
    });

    return users.map(u => {
      const emp = u.employee;
      return {
        id:             u.id,
        email:          u.email,
        role:           u.role,
        firstName:      u.firstName,
        lastName:       u.lastName,
        isActive:       u.isActive,
        createdAt:      u.createdAt,
        isSystemUser:   !emp,
        systemUserType: u.systemUserType,
        employee: emp ? {
          id:         emp.id,
          firstName:  emp.firstName,
          lastName:   emp.lastName,
          photoUrl:   emp.documents[0] ? avatarUrl(emp.documents[0].path) : null,
          position:   emp.position,
          department: emp.department,
        } : null,
      };
    });
  }

  async createSystemUser(data: CreateSystemUserDto, db: PrismaClient) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('El correo ya está registrado en este tenant', 409);

    const typeRecord = await db.systemUserType.findUnique({ where: { id: data.systemUserTypeId } });
    if (!typeRecord) throw new AppError('Tipo de usuario no encontrado', 404);
    if (!typeRecord.isActive) throw new AppError('El tipo de usuario está inactivo', 400);

    const perms = typeRecord.permissions as any;
    // Todos los usuarios de sistema necesitan mínimo HR_ANALYST para acceder al panel admin.
    // Los permisos del tipo controlan lo que pueden HACER; el rol controla el acceso al API.
    const role =
      perms?.canManageUsers  ? 'COMPANY_ADMIN' :
      perms?.canManageConfig ? 'HR_MANAGER'    :
      'HR_ANALYST';

    const passwordHash = await argon2.hash(data.password);

    return db.user.create({
      data: {
        email:            data.email,
        passwordHash,
        role,
        firstName:        data.firstName,
        lastName:         data.lastName,
        systemUserTypeId: data.systemUserTypeId,
        isActive:         true,
      },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        isActive: true, createdAt: true,
        systemUserType: { select: { id: true, name: true, slug: true, color: true } },
      },
    });
  }

  async updateUserType(userId: string, data: UpdateUserTypeDto, db: PrismaClient) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const typeRecord = await db.systemUserType.findUnique({ where: { id: data.systemUserTypeId } });
    if (!typeRecord) throw new AppError('Tipo de usuario no encontrado', 404);
    if (!typeRecord.isActive) throw new AppError('El tipo de usuario está inactivo', 400);

    const perms = typeRecord.permissions as any;
    const role =
      perms?.canManageUsers  ? 'COMPANY_ADMIN' :
      perms?.canManageConfig ? 'HR_MANAGER'    :
      'HR_ANALYST';

    return db.user.update({
      where: { id: userId },
      data:  { systemUserTypeId: data.systemUserTypeId, role },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        isActive: true, createdAt: true,
        systemUserType: { select: { id: true, name: true, slug: true, color: true, permissions: true } },
      },
    });
  }

  async updateRole(userId: string, data: UpdateUserRoleDto, db: PrismaClient) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return db.user.update({
      where: { id: userId },
      data:  { role: data.role },
      select: { id: true, email: true, role: true, isActive: true },
    });
  }

  async toggleStatus(userId: string, db: PrismaClient) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return db.user.update({
      where: { id: userId },
      data:  { isActive: !user.isActive },
      select: { id: true, email: true, role: true, isActive: true },
    });
  }
}
