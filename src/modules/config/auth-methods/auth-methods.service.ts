import { platformPrisma } from '../../../config/platform-prisma';
import { AppError } from '../../../shared/middlewares/error.middleware';

const VALID_METHODS = ['EMAIL', 'MICROSOFT'] as const;
type Method = typeof VALID_METHODS[number];

export class AuthMethodsService {

  async list(tenantId: string) {
    const configs = await platformPrisma.tenantAuthConfig.findMany({
      where:   { tenantId },
      orderBy: { method: 'asc' },
      select:  { id: true, method: true, enabled: true, azureTenantId: true },
    });

    // Garantiza que EMAIL siempre aparece, aunque no tenga registro
    const methodSet = new Set(configs.map(c => c.method));
    const result = [...configs];
    if (!methodSet.has('EMAIL')) {
      result.unshift({ id: '', method: 'EMAIL', enabled: true, azureTenantId: null });
    }
    return result;
  }

  async upsert(tenantId: string, method: string, body: { enabled: boolean; azureTenantId?: string | null }) {
    if (!VALID_METHODS.includes(method as Method)) {
      throw new AppError(`Método de autenticación inválido: ${method}`, 400);
    }

    if (method === 'MICROSOFT' && body.enabled && !body.azureTenantId?.trim()) {
      throw new AppError('El Azure Directory ID es obligatorio para habilitar Microsoft SSO.', 400);
    }

    // Verificar que no queda ningún método habilitado si se desactiva este
    if (!body.enabled) {
      const otherEnabled = await platformPrisma.tenantAuthConfig.findFirst({
        where: { tenantId, method: { not: method as Method }, enabled: true },
      });
      // EMAIL es implícitamente habilitado aunque no exista registro
      const emailAlwaysOn = method !== 'EMAIL';
      if (!otherEnabled && !emailAlwaysOn) {
        throw new AppError('Debe quedar al menos un método de acceso habilitado.', 400);
      }
    }

    return platformPrisma.tenantAuthConfig.upsert({
      where:  { tenantId_method: { tenantId, method: method as Method } },
      create: {
        tenantId,
        method:        method as Method,
        enabled:       body.enabled,
        azureTenantId: method === 'MICROSOFT' ? (body.azureTenantId?.trim() || null) : null,
      },
      update: {
        enabled:       body.enabled,
        azureTenantId: method === 'MICROSOFT' ? (body.azureTenantId?.trim() || null) : undefined,
      },
      select: { id: true, method: true, enabled: true, azureTenantId: true },
    });
  }
}
