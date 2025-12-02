import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Importar rutas de módulos
import authRoutes from './modules/auth/auth.routes';

const app: Application = express();

// 1. Middlewares Globales
app.use(express.json()); // Leer JSON en el body
app.use(cors());         // Permitir peticiones desde el Frontend (Angular)
app.use(helmet());       // Seguridad de cabeceras HTTP
app.use(morgan('dev'));  // Logs de peticiones en consola

// 2. Rutas por Dominio
app.use('/api/auth', authRoutes);

// 3. Ruta de prueba de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

export default app;