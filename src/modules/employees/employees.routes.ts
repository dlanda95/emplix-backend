import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/multer.config';
import * as controller from './employees.controller';

const router = Router();
router.use(authMiddleware);

// --- RUTAS ESTÁTICAS (Primero) ---
router.get('/me', controller.getMe);
router.get('/search', controller.searchEmployees);
router.get('/my-team', controller.getMyTeam);
router.get('/', controller.getDirectory);

// --- RUTAS DE CREACIÓN/ACTUALIZACIÓN ---
router.post('/', controller.create);
router.patch('/:id/assign', controller.updateAssignment);

// --- RUTAS DE ARCHIVOS (Con Multer) ---
router.post('/:id/avatar', upload.single('avatar'), controller.uploadAvatar);
router.post('/:id/documents', upload.single('file'), controller.uploadDocument);
router.get('/documents/:documentId/url', controller.getDocumentUrl);

// --- RUTAS DINÁMICAS (Si en futuro pones getById, va AL FINAL) ---
// router.get('/:id', controller.getEmployeeById); 

export default router;