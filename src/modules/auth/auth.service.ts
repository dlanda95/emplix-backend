import { prisma } from '../../config/prisma';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, SystemRole } from '@prisma/client'; // Importamos los tipos generados

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';

export class AuthService {

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
}