import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDTO, AssignAdminDataDTO } from './employees.interface'; // 👈 Importamos tus DTOs

const service = new EmployeesService();

// ==========================================
// 1. CONTEXTO PERSONAL (Rutas "Me")
// ==========================================

// GET /me - Perfil del usuario logueado
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; 
    
    const result = await service.getMyProfile(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// GET /my-team - Contexto de equipo (Jefe, pares, subordinados)
export const getMyTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.tenant!.id; 
    
    // Validación básica de seguridad (aunque el middleware auth ya lo cubre)
    if (!userId) throw new Error('Usuario no identificado');
    
    const result = await service.getMyTeamContext(userId, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// ==========================================
// 2. DIRECTORIO Y BÚSQUEDA (Rutas Generales)
// ==========================================

// GET / - Listado completo (Directory)
export const getDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id; 
    const result = await service.getAllEmployees(tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// GET /search?q=... - Buscador
export const searchEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenant!.id; 

    // Validación rápida de entrada
    if (!q || typeof q !== 'string') return res.json([]);
    
    const results = await service.searchEmployees(q, tenantId);
    res.json(results);
  } catch (error) { next(error); }
};

// ==========================================
// 3. GESTIÓN DE EMPLEADOS (CRUD)
// ==========================================

// POST / - Crear Empleado (Onboarding)
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.id;
    // Tipado estricto con DTO
    const data: CreateEmployeeDTO = req.body; 
    
    const result = await service.createEmployee(data, tenantId);
    
    // Status 201 Created
    res.status(201).json(result);
  } catch (error) { next(error); }
};

// PATCH /:id/assign - Actualizar datos administrativos
export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id; 
    // Tipado estricto con DTO
    const data: AssignAdminDataDTO = req.body;

    const result = await service.assignAdministrativeData(id, data, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};

// ==========================================
// 4. ARCHIVOS Y DOCUMENTOS
// ==========================================

// POST /:id/avatar - Subir foto de perfil
export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const file = req.file;

    // Validación HTTP básica
    if (!file) return res.status(400).json({ message: 'No se ha enviado ningún archivo de imagen' });

    const result = await service.uploadAvatar(id, file, tenantId, userId);
    
    // Estandarizamos la respuesta
    res.status(201).json({
      message: 'Foto de perfil actualizada correctamente',
      document: result
    });
  } catch (error) { next(error); }
};

// POST /:id/documents - Subir documento genérico (Contrato, etc.)
export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const file = req.file;
    const { type } = req.body; 

    if (!file) return res.status(400).json({ message: 'Falta el archivo' });
    if (!type) return res.status(400).json({ message: 'Falta el tipo de documento' });

    const result = await service.uploadDocument(id, file, type, tenantId, userId);
    
    res.status(201).json({ message: 'Documento subido', document: result });
  } catch (error) { next(error); }
};

// GET /documents/:documentId/url - Obtener link de descarga (SAS Token)
export const getDocumentUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params; 
    const tenantId = req.tenant!.id;

    const url = await service.getDocumentLink(documentId, tenantId);
    
    res.json({ url });
  } catch (error) { next(error); }
};

// GET /:id - Obtener detalle completo de un empleado (Admin)
export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenant!.id; 
    
    // Llamamos al servicio que ya tiene la lógica (y trae laborData)
    const result = await service.getEmployeeById(id, tenantId);
    
    res.json(result);
  } catch (error) { next(error); }
};



