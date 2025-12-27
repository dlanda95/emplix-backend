import { Request, Response,NextFunction } from 'express';
import { AuthService } from './auth.service';


const authService = new AuthService();


// --- Endpoint de Verificación de Email ---
export const checkEmailExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requerido' });

    // 1. Obtenemos el Tenant ID del request
    const tenantId = req.tenant!.id; 

    // 2. Lo pasamos al servicio
    const exists = await authService.checkEmail(email, tenantId);
    res.json({ exists }); 

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error al verificar email' });
  }
};

// --- LOGIN ---
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan credenciales' });
    }

    const tenantId = req.tenant!.id; // <--- CRÍTICO: Saber en qué empresa se loguea

    const result = await authService.login(email, password, tenantId);
    res.json(result);
  } catch (error: any) {
    // Unificamos mensajes de error comunes
    if (error.message === 'Credenciales inválidas' || error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};


// --- MICROSOFT LOGIN ---
export const microsoftLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body; 
    if (!token) throw new Error('Token es requerido');

    const tenantId = req.tenant!.id; // <--- CRÍTICO

    // Ahora el login de Microsoft busca al usuario DENTRO de esta empresa específica
    const result = await authService.loginWithMicrosoft(token, tenantId);
    res.json(result);
  } catch (error) { next(error); }
};


// --- REGISTER ---
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const tenantId = req.tenant!.id; // <--- CRÍTICO

    const user = await authService.register(req.body, tenantId);
    res.status(201).json(user);

  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'El correo electrónico ya está registrado en esta empresa.',
        code: 'USER_EXISTS'
      });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario', detail: error.message });
  }
};



// --- NUEVO: Controlador GET /me ---
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; 
    
    // OBTENEMOS EL TENANT ID DEL REQUEST (Ya validado por middleware)
    const tenantId = req.tenant?.id; 

    if (!userId || !tenantId) return res.status(401).json({ message: 'No autorizado' });

    // PASAMOS AMBOS PARÁMETROS
    const profile = await authService.getMyProfile(userId, tenantId);
    res.json(profile);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
}