import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { SystemRole } from '@prisma/client';
import { upload } from '../../config/multer.config';
import * as controller from './employees.controller';

const router = Router();
router.use(authMiddleware);

// --- RUTAS PROPIAS (me) ---
router.get('/me/history',                       controller.getMyHistory);
router.get('/me/documents',                     controller.getMyDocuments);
router.post('/me/documents', upload.single('file'), controller.uploadMyDocument);
router.get('/me',                               controller.getMe);
router.get('/my-team', controller.getMyTeam);
router.get('/search', controller.searchEmployees);
router.get('/', controller.getDirectory); // GetAll
router.get('/:id', controller.getEmployeeById);

// --- ESCRITURA ---
router.post('/', requireRole([SystemRole.COMPANY_ADMIN]), controller.create);

// 🔥 ESTA ES LA RUTA OFICIAL AHORA (Borra la vieja 'assign' si existe)
router.patch('/:id/administrative', requireRole([SystemRole.COMPANY_ADMIN]), controller.updateAssignment);

// --- ARCHIVOS ---
router.delete('/documents/:documentId', controller.deleteDocument);
router.post('/:id/avatar', upload.single('avatar'), controller.uploadAvatar);
router.post('/:id/documents', upload.single('file'), controller.uploadDocument);
router.get('/documents/:documentId/url', controller.getDocumentUrl);

export default router;