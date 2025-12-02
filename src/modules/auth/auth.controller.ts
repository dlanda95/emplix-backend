import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';

const authService = new AuthService();


// --- NUEVO: Endpoint de Verificación ---
export const checkEmailExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requerido' });

    const exists = await authService.checkEmail(email);
    res.json({ exists }); // Devuelve { exists: true/false }

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar email' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan credenciales' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    // Validamos que vengan los datos mínimos
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const user = await authService.register(req.body);
    res.status(201).json(user);

  } catch (error: any) {
    // P2002: Código de Prisma para "Unique Constraint Violation" (Email duplicado)
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'El correo electrónico ya está registrado.',
        code: 'USER_EXISTS'
      });
    }
    
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario', detail: error.message });
  }
};



// --- NUEVO: Controlador GET /me ---
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    // El ID viene del middleware (Token)
    const userId = req.user?.id; 
    
    if (!userId) return res.status(401).json({ message: 'No autorizado' });

    const profile = await authService.getMyProfile(userId);
    res.json(profile);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }}