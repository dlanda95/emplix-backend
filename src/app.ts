import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Importar rutas de módulos
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';
// ... imports
import requestsRoutes from './modules/requests/requests.routes';

import { globalErrorHandler } from './shared/middlewares/error.middleware';

import employeesRoutes from './modules/employees/employees.routes';

import attendanceRoutes from './modules/attendance/attendance.routes';




const app: Application = express();

// 1. Middlewares Globales
app.use(express.json()); // Leer JSON en el body
app.use(cors());         // Permitir peticiones desde el Frontend (Angular)
app.use(helmet());       // Seguridad de cabeceras HTTP
app.use(morgan('dev'));  // Logs de peticiones en consola

// 2. Rutas por Dominio
app.use('/api/auth', authRoutes);
app.use('/api/organization', organizationRoutes); // <--- REGISTRAR NUEVA RUTA
app.use('/api/requests', requestsRoutes); // <--- NUEVA RUTA
app.use('/api/attendance', attendanceRoutes);

// 3. Ruta de prueba de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use('/api/employees', employeesRoutes);


// Manejo de Errores (SIEMPRE AL FINAL)
app.use(globalErrorHandler);
export default app;