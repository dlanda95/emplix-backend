import { PrismaClient } from '../generated/tenant-client';

class TenantPrismaManager {
  private static instance: TenantPrismaManager;
  private readonly clients = new Map<string, PrismaClient>();

  static getInstance(): TenantPrismaManager {
    if (!TenantPrismaManager.instance) {
      TenantPrismaManager.instance = new TenantPrismaManager();
    }
    return TenantPrismaManager.instance;
  }

  /**
   * Retorna (o crea) el PrismaClient para el schema del tenant dado.
   * La URL de conexión apunta al schema PostgreSQL específico de la empresa,
   * garantizando aislamiento total de datos entre tenants.
   */
  getClient(schemaName: string): PrismaClient {
    if (this.clients.has(schemaName)) {
      return this.clients.get(schemaName) as PrismaClient;
    }

    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error('La variable de entorno DATABASE_URL no está definida.');

    // Eliminar cualquier ?schema= existente y agregar el del tenant
    const cleanUrl  = baseUrl.replace(/[?&]schema=[^&]*/g, '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const tenantUrl = `${cleanUrl}${separator}schema=${schemaName}`;

    const client = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
    this.clients.set(schemaName, client);

    return client;
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.$disconnect();
    }
    this.clients.clear();
  }
}

export const tenantPrismaManager = TenantPrismaManager.getInstance();
