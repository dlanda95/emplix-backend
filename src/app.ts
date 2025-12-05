import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Importar rutas de módulos
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';

import { globalErrorHandler } from './shared/middlewares/error.middleware';

const app: Application = express();

// 1. Middlewares Globales
app.use(express.json()); // Leer JSON en el body
app.use(cors());         // Permitir peticiones desde el Frontend (Angular)
app.use(helmet());       // Seguridad de cabeceras HTTP
app.use(morgan('dev'));  // Logs de peticiones en consola

// 2. Rutas por Dominio
app.use('/api/auth', authRoutes);
app.use('/api/org', organizationRoutes); // <--- REGISTRAR NUEVA RUTA

// 3. Ruta de prueba de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});


// Manejo de Errores (SIEMPRE AL FINAL)
app.use(globalErrorHandler);
export default app;