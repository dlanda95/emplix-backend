import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/auth.middleware';
import { validate } from '../../shared/middlewares/validate.middleware';
import { upload } from '../../config/multer.config';
import { createEmployeeSchema, updateAssignmentSchema } from './employees.schemas';
import * as controller from './employees.controller';

const router = Router();
router.use(authMiddleware);

// --- RUTAS PROPIAS ---
router.get('/me/history',  controller.getMyHistory);
router.get('/me/documents', controller.getMyDocuments);
router.post('/me/documents', upload.single('file'), controller.uploadMyDocument);
router.get('/me',          controller.getMe);
router.patch('/me',        controller.patchMe);
router.get('/my-team',     controller.getMyTeam);
router.get('/search',      controller.searchEmployees);
router.get('/',            controller.getDirectory);
router.get('/:id',         controller.getEmployeeById);

// --- ESCRITURA (Solo admins) ---
router.post('/', requireRole(['COMPANY_ADMIN', 'HR_MANAGER']), validate(createEmployeeSchema), controller.create);
router.patch('/:id/administrative', requireRole(['COMPANY_ADMIN', 'HR_MANAGER']), validate(updateAssignmentSchema), controller.updateAssignment);

// --- ARCHIVOS ---
router.delete('/documents/:documentId', controller.deleteDocument);
router.post('/:id/avatar',    upload.single('avatar'), controller.uploadAvatar);
router.post('/:id/documents', upload.single('file'),   controller.uploadDocument);
router.get('/documents/:documentId/url', controller.getDocumentUrl);

export default router;
