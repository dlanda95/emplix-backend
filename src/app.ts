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
import { laborRoutes } from './modules/labor/labor.routes';
import familyRoutes     from './modules/family/family.routes';
import educationRoutes  from './modules/education/education.routes';
import candidatesRoutes from './modules/candidates/candidates.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import usersRoutes      from './modules/users/users.routes';
import systemConfigRoutes from './modules/system-config/system-config.routes';

const app: Application = express();

// Azure App Service (y cualquier reverse proxy) añade X-Forwarded-For.
// Con trust proxy, Express lee la IP real del cliente en lugar de la del proxy.
app.set('trust proxy', 1);

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

// CORS restringido al dominio del frontend.
// CORS_ORIGIN en Railway/Azure = "https://mi-app.azurestaticapps.net"
// Para múltiples orígenes (ej: custom domain + preview), separar por comas.
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origen (apps móviles, curl, health checks internos)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) {
      // Sin CORS_ORIGIN configurado: solo en desarrollo local
      return process.env.NODE_ENV === 'production'
        ? callback(new Error(`CORS: origin ${origin} no permitido`))
        : callback(null, true);
    }
    return allowedOrigins.includes(origin)
      ? callback(null, true)
      : callback(new Error(`CORS: origin ${origin} no permitido`));
  },
  credentials: true,
}));

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

app.use('/api/labor',      laborRoutes);
app.use('/api/family',     familyRoutes);
app.use('/api/education',  educationRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/system-config', systemConfigRoutes);

// ==========================================
// 6. MANEJO DE ERRORES (Siempre al final)
// ==========================================
app.use(globalErrorHandler);

export default app;