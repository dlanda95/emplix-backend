import { Prisma, PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';
import { CreateSystemUserTypeDto, UpdateSystemUserTypeDto, DEFAULT_PERMISSIONS } from './system-config.dto';

const toJson = (v: object): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

export class SystemConfigService {

  async listUserTypes(db: PrismaClient) {
    return db.systemUserType.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    });
  }

  async getUserType(id: string, db: PrismaClient) {
    const type = await db.systemUserType.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!type) throw new AppError('Tipo de usuario no encontrado', 404);
    return type;
  }

  async createUserType(data: CreateSystemUserTypeDto, db: PrismaClient) {
    const existing = await db.systemUserType.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(`Ya existe un tipo con el slug '${data.slug}'`, 409);

    return db.systemUserType.create({
      data: {
        name:        data.name,
        slug:        data.slug,
        description: data.description,
        permissions: toJson(data.permissions ?? DEFAULT_PERMISSIONS),
        color:       data.color ?? '#6B7280',
        isSystem:    false,
      },
    });
  }

  async updateUserType(id: string, data: UpdateSystemUserTypeDto, db: PrismaClient) {
    const type = await db.systemUserType.findUnique({ where: { id } });
    if (!type) throw new AppError('Tipo de usuario no encontrado', 404);

    return db.systemUserType.update({
      where: { id },
      data: {
        ...(data.name        !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.permissions !== undefined && { permissions: toJson(data.permissions) }),
        ...(data.color       !== undefined && { color: data.color }),
        ...(data.isActive    !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteUserType(id: string, db: PrismaClient) {
    const type = await db.systemUserType.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!type) throw new AppError('Tipo de usuario no encontrado', 404);
    if (type.isSystem) throw new AppError('Los tipos de sistema no se pueden eliminar', 403);
    if (type._count.users > 0)
      throw new AppError('No se puede eliminar: hay usuarios con este tipo asignado', 400);

    return db.systemUserType.delete({ where: { id } });
  }
}
