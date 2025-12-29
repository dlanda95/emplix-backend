import multer from 'multer';
import { AppError } from '../shared/middlewares/error.middleware';

// Configuración: Guardar en memoria (RAM) temporalmente
const storage = multer.memoryStorage();

// Filtro de seguridad: ¿Qué archivos permitimos?
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Para Avatars, solo permitimos imágenes
  if (file.fieldname === 'avatar') {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Solo se permiten archivos de imagen para la foto de perfil', 400), false);
    }
  }
  
  // Aquí podrás agregar más reglas para contratos (PDFs) en el futuro
  
  cb(null, true);
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB por archivo
  },
  fileFilter: fileFilter
});