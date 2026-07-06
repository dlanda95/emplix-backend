import { PrismaClient } from '../../../generated/tenant-client';
import { AppError } from '../../../shared/middlewares/error.middleware';

export class DomainsService {

  async listPublic(db: PrismaClient) {
    return db.tenantDomain.findMany({
      where:   { isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { domain: 'asc' }],
      select:  { id: true, domain: true, label: true, isPrimary: true },
    });
  }

  async listAll(db: PrismaClient) {
    return db.tenantDomain.findMany({
      orderBy: [{ isPrimary: 'desc' }, { domain: 'asc' }],
    });
  }

  async create(data: { domain: string; label?: string }, db: PrismaClient) {
    const existing = await db.tenantDomain.findUnique({ where: { domain: data.domain } });
    if (existing) throw new AppError('El dominio ya está registrado', 409);

    const count = await db.tenantDomain.count();
    // El primero creado se vuelve primario automáticamente
    return db.tenantDomain.create({
      data: {
        domain:    data.domain.toLowerCase().trim(),
        label:     data.label?.trim() || null,
        isPrimary: count === 0,
        isActive:  true,
      },
    });
  }

  async update(id: string, data: { label?: string; isActive?: boolean }, db: PrismaClient) {
    const domain = await db.tenantDomain.findUnique({ where: { id } });
    if (!domain) throw new AppError('Dominio no encontrado', 404);

    return db.tenantDomain.update({
      where: { id },
      data: {
        ...(data.label     !== undefined && { label: data.label?.trim() || null }),
        ...(data.isActive  !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async setPrimary(id: string, db: PrismaClient) {
    const domain = await db.tenantDomain.findUnique({ where: { id } });
    if (!domain) throw new AppError('Dominio no encontrado', 404);
    if (!domain.isActive) throw new AppError('No se puede establecer un dominio inactivo como primario', 400);

    // Desmarcar el primario actual y marcar el nuevo en una transacción
    await db.$transaction([
      db.tenantDomain.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } }),
      db.tenantDomain.update({ where: { id }, data: { isPrimary: true } }),
    ]);

    return db.tenantDomain.findUnique({ where: { id } });
  }

  async remove(id: string, db: PrismaClient) {
    const domain = await db.tenantDomain.findUnique({ where: { id } });
    if (!domain) throw new AppError('Dominio no encontrado', 404);
    if (domain.isPrimary) throw new AppError('No se puede eliminar el dominio primario. Establece otro como primario primero.', 400);

    await db.tenantDomain.delete({ where: { id } });
  }
}
