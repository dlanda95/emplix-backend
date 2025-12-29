import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/multer.config'; // <--- IMPORTAR MULTER
import * as controller from './employees.controller';

const router = Router();

router.use(authMiddleware);

// Rutas Generales
router.post('/', controller.create); // <--- NUEVA: Crear Empleado
router.get('/', controller.getDirectory); // Listar todos
router.get('/search', controller.searchEmployees); 

// Rutas Personales
router.get('/my-team', controller.getMyTeam); 

// Rutas Específicas por ID
router.patch('/:id/assign', controller.updateAssignment);

// RUTA PARA SUBIR FOTO
// POST /api/employees/:id/avatar
// 'avatar' es el nombre del campo que debe enviar el Frontend (FormData)
router.post('/:id/avatar', upload.single('avatar'), controller.uploadAvatar);

// Subir Contrato/Doc (POST)
router.post('/:id/documents', upload.single('file'), controller.uploadDocument);


// Vamos a ponerla global para facilitar: /api/employees/documents/:documentId/url
router.get('/documents/:documentId/url', controller.getDocumentUrl);

export default router;