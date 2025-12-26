import { Tenant } from '@prisma/client';

declare global {
  namespace Express {
    
    // 1. Definimos la interfaz DENTRO del namespace Express
    // y le ponemos 'export' para que sea accesible desde fuera.
    export interface UserPayload {
      id: string;
      email: string;
      role: string;
      tenantId: string;
    }

    // 2. Ahora req.user usa esa interfaz interna
    interface Request {
      tenant?: Tenant; 
      user?: UserPayload; 
    }
  }
}