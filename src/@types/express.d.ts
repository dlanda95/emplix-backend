import { PrismaClient } from '../generated/tenant-client';

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  schemaName: string;
  authMethods: Array<{
    method: 'EMAIL' | 'MICROSOFT' | 'GOOGLE';
    azureTenantId?: string;
  }>;
}

interface UserPayload {
  id: string;
  email: string;
  role: string;
  tenantSlug: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      tenant?: TenantInfo;
      tenantPrisma?: PrismaClient;
    }
  }
}