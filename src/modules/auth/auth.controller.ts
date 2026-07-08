import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ok, created, badRequest } from '../../shared/utils/response';

const authService = new AuthService();

export const verifyTenant = async (req: Request, res: Response): Promise<void> => {
  const tenant = req.tenant!;
  ok(res, {
    exists: true,
    name: tenant.name,
    slug: tenant.slug,
    authMethods: tenant.authMethods.map(a => a.method),
    hasMicrosoftSSO: tenant.authMethods.some(a => a.method === 'MICROSOFT'),
  });
};

export const checkEmailExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { badRequest(res, 'Email requerido'); return; }

    const exists = await authService.checkEmail(email, req.tenantPrisma!);
    ok(res, { exists });
  } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { badRequest(res, 'Credenciales requeridas'); return; }

    const result = await authService.login(email, password, req.tenant!.slug, req.tenantPrisma!);
    ok(res, result);
  } catch (error) { next(error); }
};

export const microsoftLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) { badRequest(res, 'Token requerido'); return; }

    const msConfig = req.tenant!.authMethods.find(a => a.method === 'MICROSOFT');
    if (!msConfig?.azureTenantId) {
      badRequest(res, 'Esta empresa no tiene autenticación con Microsoft configurada.');
      return;
    }

    const result = await authService.loginWithMicrosoft(
      token,
      req.tenant!.slug,
      msConfig.azureTenantId,
      req.tenantPrisma!,
    );
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

    const user = await authService.register(req.body, req.tenant!.slug, req.tenantPrisma!);
    created(res, user);
  } catch (error) { next(error); }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) { badRequest(res, 'No autorizado'); return; }
    const profile = await authService.getMyProfile(req.user.id, req.tenantPrisma!);
    ok(res, profile);
  } catch (error) { next(error); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { badRequest(res, 'Email requerido'); return; }
    await authService.forgotPassword(email, req.tenant!.slug, req.tenantPrisma!);
    // Respuesta genérica siempre — no revelar si el email existe
    ok(res, { message: 'Si el correo está registrado, recibirás un enlace en los próximos minutos.' });
  } catch (error) { next(error); }
};

export const verifyResetToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.query['token'] as string;
    if (!token) { badRequest(res, 'Token requerido'); return; }
    const valid = await authService.verifyResetToken(token, req.tenantPrisma!);
    ok(res, { valid });
  } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { badRequest(res, 'Token y contraseña son requeridos'); return; }
    await authService.resetPassword(token, password, req.tenantPrisma!);
    ok(res, { message: 'Contraseña actualizada correctamente.' });
  } catch (error) { next(error); }
};
