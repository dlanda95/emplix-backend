import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Importar rutas de módulos
import { tenantMiddleware } from './shared/middlewares/tenant.middleware';
import { globalErrorHandler } from './shared/middlewares/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';
import requestsRoutes from './modules/requests/requests.routes';
import employeesRoutes from './modules/employees/employees.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import kudosRoutes from './modules/kudos/kudos.routes';

const app: Application = express();

// 1. Configurar Morgan para ver el Tenant en la consola
// Creamos un token personalizado llamado 'tenant'
morgan.token('tenant', (req: any) => {
  // Intentamos leer el slug del header o del objeto req.tenant si ya se procesó
  return req.headers['x-tenant-slug'] || '???';
});

// Usamos un formato personalizado: METODO RUTA [TENANT] STATUS TIEMPO
app.use(morgan(':method :url [:tenant] :status :response-time ms'));

// ==========================================
// 1. MIDDLEWARES GLOBALES (Se ejecutan siempre)
// ==========================================
app.use(express.json()); 
app.use(cors());         
app.use(helmet());       
app.use(morgan('dev'));  

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
// 4. RUTAS PROTEGIDAS POR TENANT
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/kudos', kudosRoutes);

// ==========================================
// 5. MANEJO DE ERRORES (Siempre al final)
// ==========================================
app.use(globalErrorHandler);

export default app;