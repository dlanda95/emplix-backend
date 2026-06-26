import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from './employees.service';
import { ok, created, badRequest, noContent } from '../../shared/utils/response';
import { CreateEmployeeDto, AssignAdminDataDto } from './employees.dto';

const service = new EmployeesService();

export const getMyDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getEmployeeDocuments(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const uploadMyDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[CTRL uploadMyDocument] hit — file:%s type:%s label:%s', req.file?.originalname, req.body.type, req.body.label);
  try {
    if (!req.file)      { badRequest(res, 'Falta el archivo');           return; }
    if (!req.body.type) { badRequest(res, 'Falta el tipo de documento'); return; }
    created(res, await service.uploadMyDocument(req.user!.id, req.file, req.body.type, req.tenant!.slug, req.tenantPrisma!, req.body.label));
  } catch (error) { next(error); }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deleteEmployeeDocument(req.params.documentId, req.user!.id, req.tenantPrisma!);
    noContent(res);
  } catch (error) { next(error); }
};

export const getMyHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getEmploymentHistory(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getMyProfile(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const patchMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.updateMyProfile(req.user!.id, req.body, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getMyTeam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getMyTeamContext(req.user!.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const getDirectory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getAllEmployees(req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const searchEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') { ok(res, []); return; }
    ok(res, await service.searchEmployees(q, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, await service.getEmployeeById(req.params.id, req.tenantPrisma!)); }
  catch (error) { next(error); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    created(res, await service.createEmployee(req.body as CreateEmployeeDto, req.tenant!.slug, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    ok(res, await service.assignAdministrativeData(req.params.id, req.body as AssignAdminDataDto, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { badRequest(res, 'No se ha enviado ningún archivo de imagen'); return; }
    created(res, await service.uploadAvatar(req.params.id, req.file, req.tenant!.slug, req.user!.id, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file)      { badRequest(res, 'Falta el archivo');           return; }
    if (!req.body.type) { badRequest(res, 'Falta el tipo de documento'); return; }
    created(res, await service.uploadDocument(req.params.id, req.file, req.body.type, req.tenant!.slug, req.user!.id, req.tenantPrisma!));
  } catch (error) { next(error); }
};

export const getDocumentUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { ok(res, { url: await service.getDocumentLink(req.params.documentId, req.tenantPrisma!) }); }
  catch (error) { next(error); }
};
