import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/multer.config';
import * as controller from './employees.controller';

const router = Router();

router.use(authMiddleware);

// --- RUTA NUEVA (PONER PRIMERO) ---
// Esta es la línea que te falta para que funcione el F5
router.get('/me', controller.getMe); 
// -----------------------------------

// Rutas Generales
router.post('/', controller.create); 
router.get('/', controller.getDirectory); 
router.get('/search', controller.searchEmployees); 

// Rutas Personales
router.get('/my-team', controller.getMyTeam); 

// Rutas Específicas por ID
// NOTA: Si necesitas ver el perfil de OTROS, deberías tener un GET /:id aquí también.
// router.get('/:id', controller.getEmployeeById); <--- (Descomenta si la necesitas)

router.patch('/:id/assign', controller.updateAssignment);

// RUTA PARA SUBIR FOTO
router.post('/:id/avatar', upload.single('avatar'), controller.uploadAvatar);

// Subir Contrato/Doc (POST)
router.post('/:id/documents', upload.single('file'), controller.uploadDocument);

// Link de descarga
router.get('/documents/:documentId/url', controller.getDocumentUrl);

export default router;