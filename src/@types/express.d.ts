import { Tenant } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

declare global {
  namespace Express {
    // Definimos aquí qué trae el token EXACTAMENTE
    interface UserPayload {
      id: string;
      email: string;    // <--- Esto faltaba
      role: string;
      tenantId: string; // <--- Esto es vital para el Multi-Tenant
    }

    interface Request {
      user?: UserPayload; // Usamos la interfaz de arriba
      tenant?: Tenant;
      db?: PrismaClient;
    }
  }
}