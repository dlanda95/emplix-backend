

import { prisma } from '../../config/prisma';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, SystemRole } from '@prisma/client'; // Importamos los tipos generados
import { EntraService } from './entra/entra.services';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';




export class AuthService {

  private entraService = new EntraService();

  // --- OBTENER PERFIL ---
  async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        employee: {
          include: {
            department: true,
            position: true,
            supervisor: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!user) throw new Error('Usuario no encontrado');
    return user;
  }

  // --- VERIFICAR EMAIL ---
 // --- VERIFICAR EMAIL (Multi-Tenant) ---
  async checkEmail(email: string, tenantId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: {
        // Buscamos combinación Email + Empresa
        email_tenantId: { 
          email, 
          tenantId 
        }
      },
      select: { id: true }
    });
    return !!user;
  }

 // --- LOGIN (Multi-Tenant) ---
  // AHORA RECIBE tenantId
  async login(email: string, passwordPlain: string, tenantId: string) {
    
    // 1. Buscar usuario con la clave compuesta (Email + Tenant)
    const user = await prisma.user.findUnique({
      where: { 
        email_tenantId: {
          email: email,
          tenantId: tenantId
        }
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!user) throw new Error('Credenciales inválidas'); // Mensaje genérico por seguridad
    if (!user.isActive) throw new Error('Usuario inactivo');
    
    // Validar contraseña
    if (!user.passwordHash) throw new Error('Usuario sin contraseña configurada');
    const isValid = await argon2.verify(user.passwordHash, passwordPlain);
    
    if (!isValid) throw new Error('Credenciales inválidas');

    // 2. Generar Token (Ahora incluye el tenantId)
    const token = this.generateToken(user);
    
    // 3. Preparar respuesta
    const { passwordHash, employee, ...userRest } = user;
    
    return { 
      user: {
        ...userRest,
        firstName: employee?.firstName || 'Usuario',
        lastName: employee?.lastName || 'Sistema'
      },
      token 
    };
  }

 // --- REGISTRO (Multi-Tenant) ---
  // AHORA RECIBE tenantId
  async register(data: any, tenantId: string) {
    const hash = await argon2.hash(data.password);

    // Transacción: Creamos el User y su Employee vinculado
    // INYECTAMOS tenantId EN AMBOS
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        role: SystemRole.USER,
        tenantId: tenantId, // <--- OBLIGATORIO

        // Creamos el perfil de empleado automáticamente
        employee: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            hireDate: new Date(),
            tenantId: tenantId // <--- OBLIGATORIO TAMBIÉN EN EMPLEADO
          }
        }
      },
      include: {
        employee: true
      }
    });

    const { passwordHash, employee, ...userRest } = newUser;
    
    return {
      ...userRest,
      firstName: employee?.firstName,
      lastName: employee?.lastName
    };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        email: user.email,
        tenantId: user.tenantId // <--- Importante para seguridad en el futuro
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  }



// --- LOGIN CON MICROSOFT (Multi-Tenant) ---
  // AHORA RECIBE tenantId
  async loginWithMicrosoft(microsoftToken: string, tenantId: string) {
    
    // 1. Validar token con Microsoft
    const payload = await this.entraService.verifyToken(microsoftToken);
    
    const email = payload.preferred_username || payload.email;
    const oid = payload.oid;
    const name = payload.name;

    if (!email) throw new Error('El token de Microsoft no contiene email');

    // 2. Buscar usuario EN ESTA EMPRESA ESPECÍFICA
    let user = await prisma.user.findUnique({ 
      where: { 
        email_tenantId: {
          email,
          tenantId // <--- Filtro clave
        }
      } 
    });

    // 3. Si no existe en esta empresa, lo REGISTRAMOS aquí
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          provider: 'MICROSOFT',
          providerId: oid,
          role: 'USER',
          isActive: true,
          tenantId: tenantId, // <--- Vinculamos a la empresa actual

          employee: {
            create: {
              firstName: name.split(' ')[0] || 'Usuario',
              lastName: name.split(' ').slice(1).join(' ') || 'Nuevo',
              hireDate: new Date(),
              personalEmail: email,
              tenantId: tenantId // <--- Vinculamos empleado
            }
          }
        }
      });
    } else {
      // Si existe, actualizamos provider si hace falta
      if (user.provider === 'LOCAL') {
        await prisma.user.update({
          where: { id: user.id },
          data: { provider: 'MICROSOFT', providerId: oid }
        });
      }
    }

    // 4. Generar Token
    const token = this.generateToken(user); 

    return { 
      user: { id: user.id, email: user.email, role: user.role }, 
      token 
    };
  }}