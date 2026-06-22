import { PrismaClient } from '../generated/tenant-client';

class TenantPrismaManager {
  private static instance: TenantPrismaManager;
  private clients = new Map<string, PrismaClient>();

  static getInstance(): TenantPrismaManager {
    if (!TenantPrismaManager.instance) {
      TenantPrismaManager.instance = new TenantPrismaManager();
    }
    return TenantPrismaManager.instance;
  }

  getClient(schemaName: string): PrismaClient {
    if (!this.clients.has(schemaName)) {
      // Strip any existing ?schema=... from the base URL, then append the tenant schema
      const base = process.env.DATABASE_URL!.replace(/[?&]schema=[^&]*/, '');
      const separator = base.includes('?') ? '&' : '?';
      const url = `${base}${separator}schema=${schemaName}`;

      const client = new PrismaClient({ datasources: { db: { url } } });
      this.clients.set(schemaName, client);
    }
    return this.clients.get(schemaName)!;
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.$disconnect();
    }
    this.clients.clear();
  }
}

export const tenantPrismaManager = TenantPrismaManager.getInstance();
