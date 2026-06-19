import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ok, created, badRequest } from '../../shared/utils/response';

const authService = new AuthService();

export const verifyTenant = async (req: Request, res: Response): Promise<void> => {
  ok(res, { exists: true, name: req.tenant?.name, slug: req.tenant?.slug });
};

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { badRequest(res, 'Email requerido'); return; }

    const exists = await authService.checkEmail(email, req.tenant!.id);
    ok(res, { exists });
  } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { badRequest(res, 'Credenciales requeridas'); return; }

    const result = await authService.login(email, password, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const microsoftLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) { badRequest(res, 'Token requerido'); return; }

    const result = await authService.loginWithMicrosoft(token, req.tenant!.id);
    ok(res, result);
  } catch (error) { next(error); }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      badRequest(res, 'Todos los campos son obligatorios');
      return;
    }

    const user = await authService.register(req.body, req.tenant!.id);
    created(res, user);
  } catch (error) { next(error); }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId   = req.user?.id;
    const tenantId = req.tenant?.id;

    if (!userId || !tenantId) { badRequest(res, 'No autorizado'); return; }

    const profile = await authService.getMyProfile(userId, tenantId);
    ok(res, profile);
  } catch (error) { next(error); }
};
