

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
  async checkEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    return !!user;
  }

  // --- LOGIN ---
  async login(email: string, passwordPlain: string) {
    // 1. Buscar usuario e incluir datos básicos del empleado para el frontend
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    if (!user) throw new Error('Credenciales inválidas');
    if (!user.isActive) throw new Error('Usuario inactivo');
    
    // Validar contraseña
    if (!user.passwordHash) throw new Error('Usuario sin contraseña configurada');
    const isValid = await argon2.verify(user.passwordHash, passwordPlain);
    
    if (!isValid) throw new Error('Credenciales inválidas');

    // 2. Generar Token
    const token = this.generateToken(user);
    
    // 3. Preparar respuesta (aplanamos un poco el objeto para que el front lo lea fácil)
    const { passwordHash, employee, ...userRest } = user;
    
    return { 
      user: {
        ...userRest,
        firstName: employee?.firstName || 'Usuario', // Recuperamos nombre desde Employee
        lastName: employee?.lastName || 'Sistema'
      },
      token 
    };
  }

  // --- REGISTRO (Crear Usuario + Empleado) ---
  async register(data: any) {
    const hash = await argon2.hash(data.password);

    // Transacción: Creamos el User y su Employee vinculado al mismo tiempo
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        role: SystemRole.USER, // Usamos el Enum correcto (antes era 'EMPLEADO')
        
        // Creamos el perfil de empleado automáticamente
        employee: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            hireDate: new Date(), // Fecha de ingreso por defecto hoy
            // Campos opcionales se quedan en null por ahora
          }
        }
      },
      include: {
        employee: true // Para devolver los datos creados
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
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  }



// --- NUEVO MÉTODO: LOGIN CON MICROSOFT ---
  async loginWithMicrosoft(microsoftToken: string) {
    
    // 1. Validar token con Microsoft (Si falla, lanza error)
    const payload = await this.entraService.verifyToken(microsoftToken);
    
    // Datos clave del token
    const email = payload.preferred_username || payload.email; // Email del usuario
    const oid = payload.oid; // ID único inmutable de Microsoft (Object ID)
    const name = payload.name; // Nombre completo

    if (!email) throw new Error('El token de Microsoft no contiene email');

    // 2. Buscar usuario en nuestra BD
    let user = await prisma.user.findUnique({ where: { email } });

    // 3. Si no existe, lo REGISTRAMOS automáticamente (Auto-Provisioning)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          provider: 'MICROSOFT',
          providerId: oid,
          role: 'USER', // <--- LEAST PRIVILEGE (Como pediste)
          isActive: true,
          // Creamos ficha de empleado vacía para que pueda llenar sus datos luego
          employee: {
            create: {
              firstName: name.split(' ')[0] || 'Usuario',
              lastName: name.split(' ').slice(1).join(' ') || 'Nuevo',
              hireDate: new Date(),
              personalEmail: email
            }
          }
        }
      });
    } else {
      // Si ya existe pero era LOCAL, actualizamos para vincularlo (Opcional, seguridad)
      if (user.provider === 'LOCAL') {
        await prisma.user.update({
          where: { id: user.id },
          data: { provider: 'MICROSOFT', providerId: oid }
        });
      }
    }

    // 4. Generar NUESTRO token (Intercambio)
    // Usamos tu lógica existente de JWT para que el resto del sistema funcione igual
    const token = this.generateToken(user); 

    return { 
      user: { id: user.id, email: user.email, role: user.role }, 
      token 
    };
  }

}