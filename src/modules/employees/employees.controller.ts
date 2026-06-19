import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';
import { ok, created, badRequest, noContent } from '../../shared/utils/response';
import { CreateEmployeeDto, AssignAdminDataDto } from './employees.dto';

const service = new EmployeesService();

// ─── Documentos propios ───────────────────────────────────────────────────────

export const getMyDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const docs = await service.getEmployeeDocuments(req.user!.id, req.tenant!.id);
    ok(res, docs);
  } catch (error) { next(error); }
};

export const uploadMyDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file)      { badRequest(res, 'Falta el archivo');            return; }
    if (!req.body.type) { badRequest(res, 'Falta el tipo de documento');  return; }

    const result = await service.uploadMyDocument(
      req.user!.id, req.file, req.body.type, req.tenant!.id
    );
    created(res, result);
  } catch (error) { next(error); }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteEmployeeDocument(req.params.documentId, req.user!.id, req.tenant!.id);
    noContent(res);
  } catch (error) { next(error); }
};

// ─── Historial laboral ────────────────────────────────────────────────────────

export const getMyHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const history = await service.getEmploymentHistory(req.user!.id, req.tenant!.id);
    ok(res, history);
  } catch (error) { next(error); }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getMyProfile(req.user!.id, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const getMyTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getMyTeamContext(req.user!.id, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const getDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getAllEmployees(req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const searchEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') { ok(res, []); return; }

    const results = await service.searchEmployees(q, req.tenant!.id);
    ok(res, results);
  } catch (error) { next(error); }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.getEmployeeById(req.params.id, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: CreateEmployeeDto = req.body;
    const result = await service.createEmployee(data, req.tenant!.id);
    created(res, result);
  } catch (error) { next(error); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data: AssignAdminDataDto = req.body;
    const result = await service.assignAdministrativeData(req.params.id, data, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { badRequest(res, 'No se ha enviado ningún archivo de imagen'); return; }

    const result = await service.uploadAvatar(req.params.id, req.file, req.tenant!.id, req.user!.id);
    created(res, { message: 'Foto de perfil actualizada correctamente', document: result });
  } catch (error) { next(error); }
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file)      { badRequest(res, 'Falta el archivo'); return; }
    if (!req.body.type) { badRequest(res, 'Falta el tipo de documento'); return; }

    const result = await service.uploadDocument(req.params.id, req.file, req.body.type, req.tenant!.id, req.user!.id);
    created(res, { message: 'Documento subido', document: result });
  } catch (error) { next(error); }
};

export const getDocumentUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const url = await service.getDocumentLink(req.params.documentId, req.tenant!.id);
    ok(res, { url });
  } catch (error) { next(error); }
};
