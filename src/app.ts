import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Importar rutas de módulos
import { tenantMiddleware } from './shared/middlewares/tenant.middleware';
import { globalErrorHandler } from './shared/middlewares/error.middleware';
import { tenantRateLimiter } from './shared/middlewares/rate-limit.middleware'; // <--- 1. IMPORTAR

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';
import requestsRoutes from './modules/requests/requests.routes';
import employeesRoutes from './modules/employees/employees.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import kudosRoutes from './modules/kudos/kudos.routes';

const app: Application = express();

// ==========================================
// 0. CONFIGURACIÓN DE LOGS (Auditoría)
// ==========================================
// Token 1: Tenant (Slug)
morgan.token('tenant', (req: any) => {
  return req.headers['x-tenant-slug'] || '???';
});

// Token 2: Usuario (Email) - Útil para saber "quién rompió qué"
morgan.token('user', (req: any) => {
  return req.user?.email || 'anónimo';
});

// Formato Profesional: FECHA [TENANT] [USUARIO] METODO RUTA STATUS TIEMPO
app.use(morgan(':date[iso] [:tenant] [:user] :method :url :status :response-time ms'));

// ==========================================
// 1. MIDDLEWARES GLOBALES (Se ejecutan siempre)
// ==========================================
app.use(express.json()); 
app.use(cors());         
app.use(helmet());       
// (Borré app.use(morgan('dev')) para evitar logs duplicados)

// ==========================================
// 2. RUTAS PÚBLICAS (Sin Tenant)
// ==========================================
// El Health Check debe ir ANTES del tenantMiddleware para que AWS/Azure no den error 400
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ==========================================
// 3. MIDDLEWARE DE TENANT (El Guardián)
// ==========================================
// A partir de esta línea, TODAS las peticiones deben tener x-tenant-slug
app.use(tenantMiddleware);

// ==========================================
// 4. RATE LIMITER (El Escudo) 🛡️
// ==========================================
// Se coloca DESPUÉS del tenantMiddleware para poder usar el ID de la empresa como llave.
// Así, si 'Conexa' satura, bloqueamos a 'Conexa', pero 'Techgans' sigue feliz.
app.use('/api', tenantRateLimiter); 

// ==========================================
// 5. RUTAS PROTEGIDAS (Business Logic)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/kudos', kudosRoutes);

// ==========================================
// 6. MANEJO DE ERRORES (Siempre al final)
// ==========================================
app.use(globalErrorHandler);

export default app;