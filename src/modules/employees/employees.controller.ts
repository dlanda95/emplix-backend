import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';

const service = new EmployeesService();

// --- CREAR EMPLEADO (Onboarding) ---
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id;
    // req.body debe traer { email, firstName, lastName, documentId, hireDate... }
    const result = await service.createEmployee(req.body, tenantId);
    
    // Devolvemos status 201 y la data (incluyendo la contraseña temporal para mostrarla 1 vez)
    res.status(201).json(result);
  } catch (error) { next(error); }
};

// --- DIRECTORIO ---
export const getDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; 
    const result = await service.getAllEmployees(tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- ACTUALIZAR ASIGNACIÓN ---
export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id; 

    const result = await service.assignAdministrativeData(id, req.body, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- MI EQUIPO ---
export const getMyTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; 

    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.getMyTeamContext(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// --- BUSCADOR ---
export const searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant!.id; 

    if (!q || typeof q !== 'string') return res.json([]);
    const results = await service.searchEmployees(q, tenantId);
    res.json(results);
  } catch (error) { next(error); }
};


// --- SUBIR AVATAR ---
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // ID del empleado
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; // Quién está subiendo la foto (RRHH)
    
    // Multer deja el archivo en req.file
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No se ha enviado ningún archivo de imagen' });
    }

    const result = await service.uploadAvatar(id, file, tenantId, userId);
    
    res.status(201).json({
      message: 'Foto de perfil actualizada correctamente',
      document: result
    });
  } catch (error) {
    next(error);
  }
};


// Subir documento genérico
export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // ID Empleado
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const file = req.file;
    // El tipo de documento viene en el body (ej: "CONTRACT")
    const { type } = req.body; 

    if (!file) return res.status(400).json({ message: 'Falta el archivo' });
    if (!type) return res.status(400).json({ message: 'Falta el tipo de documento' });

    const result = await service.uploadDocument(id, file, type, tenantId, userId);
    
    res.status(201).json({ message: 'Documento subido', document: result });
  } catch (error) {
    next(error);
  }
};

// Obtener link de descarga
export const getDocumentUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Aquí el ID es del DOCUMENTO, no del empleado
    const { documentId } = req.params; 
    const tenantId = req.tenant!.id;

    const url = await service.getDocumentLink(documentId, tenantId);
    
    res.json({ url });
  } catch (error) {
    next(error);
  }
};


// En employees.controller.ts

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; 
    // Llama al servicio que ya creamos
    const result = await service.getMyProfile(userId, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


