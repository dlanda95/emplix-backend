import { prisma } from '../../config/prisma';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, SystemRole } from '@prisma/client';
import { EntraService } from './entra/entra.services';
import { AppError } from '../../shared/middlewares/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export class AuthService {
  private readonly entraService = new EntraService();

  async getMyProfile(userId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            department: { select: { name: true } },
            position:   { select: { name: true } },
            supervisor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!user) throw new AppError('Usuario no encontrado o no pertenece a esta empresa', 404, 'USER_NOT_FOUND');
    return user;
  }

  async checkEmail(email: string, tenantId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId } },
      select: { id: true },
    });
    return !!user;
  }

  async login(email: string, passwordPlain: string, tenantId: string) {
    const user = await prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId } },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    if (!user)             throw new AppError('El correo no está registrado en esta empresa.', 401, 'EMAIL_NOT_FOUND');
    if (!user.isActive)    throw new AppError('Tu cuenta está desactivada. Contacta al administrador.', 403, 'USER_INACTIVE');
    if (!user.passwordHash) throw new AppError('Esta cuenta usa inicio de sesión con Microsoft.', 400, 'MICROSOFT_ACCOUNT');

    const isValid = await argon2.verify(user.passwordHash, passwordPlain);
    if (!isValid) throw new AppError('La contraseña es incorrecta.', 401, 'WRONG_PASSWORD');

    return {
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        firstName: user.employee?.firstName || 'Usuario',
        lastName:  user.employee?.lastName  || 'Sistema',
        tenantId:  user.tenantId,
      },
      token: this.generateToken(user),
    };
  }

  async register(data: any, tenantId: string) {
    const hash = await argon2.hash(data.password);

    const newUser = await prisma.user.create({
      data: {
        email:        data.email,
        passwordHash: hash,
        role:         SystemRole.USER,
        tenantId,
        employee: {
          create: {
            firstName:     data.firstName,
            middleName:    data.middleName,
            lastName:      data.lastName,
            secondLastName: data.secondLastName,
            hireDate:      new Date(),
            tenantId,
            status:        'ACTIVE',
          },
        },
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    return {
      id:        newUser.id,
      email:     newUser.email,
      firstName: newUser.employee?.firstName,
      lastName:  newUser.employee?.lastName,
    };
  }

  async loginWithMicrosoft(microsoftToken: string, tenantId: string) {
    const payload = await this.entraService.verifyToken(microsoftToken);

    const email     = payload.preferred_username || payload.email;
    const oid       = payload.oid;
    const fullName  = payload.name || 'Usuario Microsoft';
    const [firstName, ...rest] = fullName.split(' ');
    const lastName  = rest.length ? rest.join(' ') : 'Externo';

    if (!email) throw new AppError('Token Microsoft inválido: falta email', 400, 'INVALID_MICROSOFT_TOKEN');

    let user = await prisma.user.findUnique({
      where: { email_tenantId: { email, tenantId } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          provider:    'MICROSOFT',
          providerId:  oid,
          role:        'USER',
          isActive:    true,
          tenantId,
          employee: {
            create: { firstName, lastName, hireDate: new Date(), personalEmail: email, tenantId },
          },
        },
      });
    } else if (user.provider !== 'MICROSOFT') {
      await prisma.user.update({
        where: { id: user.id },
        data:  { provider: 'MICROSOFT', providerId: oid },
      });
    }

    return {
      user:  { id: user.id, email: user.email, role: user.role, tenantId },
      token: this.generateToken(user),
    };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  }
}
