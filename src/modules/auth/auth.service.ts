import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/tenant-client';
import { EntraService } from './entra/entra.services';
import { AppError } from '../../shared/middlewares/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export class AuthService {
  private readonly entraService = new EntraService();

  async getMyProfile(userId: string, db: PrismaClient) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
            supervisor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    return user;
  }

  async checkEmail(email: string, db: PrismaClient): Promise<boolean> {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    return !!user;
  }

  async login(email: string, passwordPlain: string, tenantSlug: string, db: PrismaClient) {
    const user = await db.user.findUnique({
      where:   { email },
      include: {
        employee: {
          select: { firstName: true, lastName: true, status: true, onboardingStatus: true },
        },
        systemUserType: { select: { id: true, name: true, slug: true, color: true, permissions: true } },
      },
    });

    if (!user) throw new AppError('El correo o número de documento no está registrado en esta empresa.', 401, 'EMAIL_NOT_FOUND');
    if (!user.isActive) throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403, 'USER_INACTIVE');
    if (!user.passwordHash) throw new AppError('Esta cuenta usa inicio de sesión con Microsoft.', 400, 'MICROSOFT_ACCOUNT');

    const isValid = await argon2.verify(user.passwordHash, passwordPlain);
    if (!isValid) throw new AppError('La contraseña es incorrecta.', 401, 'WRONG_PASSWORD');

    // Para system users, el rol en DB debe reflejar sus permisos actuales.
    // Corrige silenciosamente si quedó desactualizado (ej: creado antes del fix).
    let effectiveRole = user.role;
    if (!user.employee && user.systemUserType) {
      const perms = user.systemUserType.permissions as any;
      const correctRole =
        perms?.canManageUsers  ? 'COMPANY_ADMIN' :
        perms?.canManageConfig ? 'HR_MANAGER'    :
        'HR_ANALYST';
      if (user.role !== correctRole) {
        await db.user.update({ where: { id: user.id }, data: { role: correctRole } });
        effectiveRole = correctRole;
      }
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      user: {
        id:              user.id,
        email:           user.email,
        role:            effectiveRole,
        firstName:       user.employee?.firstName ?? user.firstName ?? 'Usuario',
        lastName:        user.employee?.lastName  ?? user.lastName  ?? 'Sistema',
        tenantSlug,
        isSystemUser:    !user.employee,
        systemUserType:  user.systemUserType ?? null,
        employeeStatus:  user.employee?.status          ?? null,
        onboardingStatus:user.employee?.onboardingStatus ?? null,
      },
      token: this.generateToken(user.id, user.email, effectiveRole, tenantSlug),
    };
  }

  async register(data: any, tenantSlug: string, db: PrismaClient) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('El correo ya está registrado.', 409, 'EMAIL_TAKEN');

    const hash = await argon2.hash(data.password);

    const newUser = await db.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        role: 'EMPLOYEE',
        employee: {
          create: {
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            secondLastName: data.secondLastName,
            hireDate: new Date(),
            status: 'ACTIVE',
          },
        },
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.employee?.firstName,
      lastName: newUser.employee?.lastName,
    };
  }

  async loginWithMicrosoft(
    microsoftToken: string,
    tenantSlug: string,
    azureTenantId: string,
    db: PrismaClient,
  ) {
    const payload = await this.entraService.verifyToken(microsoftToken, azureTenantId);

    const email: string | undefined = payload.preferred_username ?? payload.email;
    const oid: string | undefined = payload.oid;

    if (!email) throw new AppError('Token de Microsoft inválido: no contiene email.', 400, 'INVALID_MICROSOFT_TOKEN');

    const user = await db.user.findUnique({
      where: { email },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    if (!user) throw new AppError(
      'Tu cuenta no está configurada en este sistema. Contacta al administrador de RRHH.',
      403,
      'AZURE_USER_NOT_PROVISIONED',
    );

    if (!user.isActive) throw new AppError('Tu cuenta está desactivada.', 403, 'USER_INACTIVE');

    // Vincular el OID de Microsoft en el primer inicio de sesión
    if (!user.providerId || user.provider !== 'MICROSOFT') {
      await db.user.update({ where: { id: user.id }, data: { provider: 'MICROSOFT', providerId: oid, lastLoginAt: new Date() } });
    } else {
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.employee?.firstName ?? 'Usuario',
        lastName: user.employee?.lastName ?? 'Externo',
        tenantSlug,
      },
      token: this.generateToken(user.id, user.email, user.role, tenantSlug),
    };
  }

  private generateToken(id: string, email: string, role: string, tenantSlug: string): string {
    return jwt.sign({ id, email, role, tenantSlug }, JWT_SECRET, { expiresIn: '8h' });
  }
}
