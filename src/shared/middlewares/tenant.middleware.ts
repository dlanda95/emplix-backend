import { Request, Response, NextFunction } from 'express';
import { platformPrisma } from '../../config/platform-prisma';
import { tenantPrismaManager } from '../../config/tenant-prisma-manager';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headerSlug = req.headers['x-tenant-slug'] as string;
    const host = req.get('host') || '';
    const subdomainSlug = host.split('.').length > 2 ? host.split('.')[0] : undefined;
    const slug = (headerSlug || subdomainSlug)?.toLowerCase();

    if (!slug) {
      return res.status(400).json({
        message: 'No se ha especificado la empresa en la cabecera x-tenant-slug.',
        code: 'TENANT_REQUIRED',
      });
    }

    const tenant = await platformPrisma.tenant.findUnique({
      where: { slug },
      include: { authConfigs: { where: { enabled: true } } },
    });

    if (!tenant) {
      return res.status(404).json({ message: `La empresa '${slug}' no existe.`, code: 'TENANT_NOT_FOUND' });
    }

    if (tenant.status === 'SUSPENDED') {
      return res.status(402).json({
        message: 'El servicio para esta organización está suspendido. Contacta al administrador.',
        code: 'TENANT_SUSPENDED',
      });
    }

    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Esta organización no está activa.', code: 'TENANT_INACTIVE' });
    }

    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      schemaName: tenant.schemaName,
      authMethods: tenant.authConfigs.map(c => ({
        method: c.method as 'EMAIL' | 'MICROSOFT' | 'GOOGLE',
        azureTenantId: c.azureTenantId ?? undefined,
      })),
    };

    req.tenantPrisma = tenantPrismaManager.getClient(tenant.schemaName);

    next();
  } catch (error) {
    console.error('Error en Tenant Middleware:', error);
    res.status(500).json({ message: 'Error interno validando la empresa.' });
  }
};
