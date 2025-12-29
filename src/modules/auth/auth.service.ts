import { prisma } from '../../config/prisma';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, SystemRole } from '@prisma/client';
import { EntraService } from './entra/entra.services';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export class AuthService {

  private entraService = new EntraService();

  /**
   * OBTENER PERFIL (Blindado)
   * Ahora requiere tenantId para asegurar que no cruzamos fronteras.
   */
  async getMyProfile(userId: string, tenantId: string) {
    // Usamos findFirst en lugar de findUnique para poder filtrar por dos campos (id + tenantId)
    // Esto asegura que el usuario pertenezca a la empresa que dice el token.
    const user = await prisma.user.findFirst({
      where: { 
        id: userId,
        tenantId: tenantId // <--- CANDADO DE SEGURIDAD
      },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true, // Útil para verificar en el front
        employee: {
          select: { // Seleccionamos solo lo necesario (Performance)
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            department: { select: { name: true } },
            position: { select: { name: true } },
            supervisor: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!user) throw new Error('Usuario no encontrado o no pertenece a esta empresa');
    return user;
  }

  // --- VERIFICAR EMAIL ---
  async checkEmail(email: string, tenantId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: {
        email_tenantId: { email, tenantId }
      },
      select: { id: true }
    });
    return !!user;
  }

  // --- LOGIN ---
  async login(email: string, passwordPlain: string, tenantId: string) {
    
    // 1. Buscar usuario (Email + Tenant)
    // Gracias al índice @@unique([email, tenantId]) esto es rapidísimo
    const user = await prisma.user.findUnique({
      where: { 
        email_tenantId: { email, tenantId }
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!user) throw new Error('Credenciales inválidas');
    if (!user.isActive) throw new Error('Usuario inactivo');
    if (!user.passwordHash) throw new Error('Usuario sin contraseña (posible cuenta Microsoft)');

    // 2. Validar contraseña
    const isValid = await argon2.verify(user.passwordHash, passwordPlain);
    if (!isValid) throw new Error('Credenciales inválidas');

    // 3. Generar Token
    const token = this.generateToken(user);
    
    // 4. Retornar info limpia
    return { 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.employee?.firstName || 'Usuario',
        lastName: user.employee?.lastName || 'Sistema',
        tenantId: user.tenantId
      },
      token 
    };
  }

  // --- REGISTRO ---
  async register(data: any, tenantId: string) {
    const hash = await argon2.hash(data.password);

    // Creamos User + Employee en una sola transacción atómica
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        role: SystemRole.USER,
        tenantId: tenantId, // <--- Vinculación Obligatoria

        employee: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            hireDate: new Date(),
            tenantId: tenantId, // <--- Vinculación Obligatoria
            // Aquí podrías agregar valores por defecto si faltan
            status: 'ACTIVE'
          }
        }
      },
      include: {
        employee: {
           select: { firstName: true, lastName: true }
        }
      }
    });
    
    // Nota: Normalmente después de registro no devolvemos token, 
    // forzamos al usuario a loguearse, pero si quieres auto-login, genera el token aquí.
    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.employee?.firstName,
      lastName: newUser.employee?.lastName
    };
  }

  // --- LOGIN CON MICROSOFT ---
  async loginWithMicrosoft(microsoftToken: string, tenantId: string) {
    
    const payload = await this.entraService.verifyToken(microsoftToken);
    
    const email = payload.preferred_username || payload.email;
    const oid = payload.oid;
    
    // Manejo de nombre seguro
    const fullName = payload.name || 'Usuario Microsoft';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Externo';

    if (!email) throw new Error('Token Microsoft inválido: falta email');

    // Buscar o Crear (Upsert logic manual para controlar tenant)
    let user = await prisma.user.findUnique({ 
      where: { email_tenantId: { email, tenantId } } 
    });

    if (!user) {
      // Registro Automático (JIT Provisioning)
      user = await prisma.user.create({
        data: {
          email,
          provider: 'MICROSOFT',
          providerId: oid,
          role: 'USER',
          isActive: true,
          tenantId: tenantId,
          employee: {
            create: {
              firstName,
              lastName,
              hireDate: new Date(),
              personalEmail: email,
              tenantId: tenantId
            }
          }
        }
      });
    } else {
      // Si existe, vinculamos la cuenta Microsoft si no lo estaba
      if (user.provider !== 'MICROSOFT') {
        await prisma.user.update({
          where: { id: user.id },
          data: { provider: 'MICROSOFT', providerId: oid }
        });
      }
    }

    const token = this.generateToken(user); 

    return { 
      user: { id: user.id, email: user.email, role: user.role, tenantId }, 
      token 
    };
  }

  // --- GENERADOR DE TOKEN CENTRALIZADO ---
  private generateToken(user: User): string {
    return jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        email: user.email,
        // tenantId es CRÍTICO para que el auth.middleware haga la validación cruzada
        tenantId: user.tenantId 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  }
}