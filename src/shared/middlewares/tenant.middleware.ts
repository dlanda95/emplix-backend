import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let slug: string | undefined;

    // ESTRATEGIA DE DETECCIÓN
    
    // 1. Intentar leer del Header (Ideal para Postman / Desarrollo Local)
    const headerSlug = req.headers['x-tenant-slug'] as string;
    if (headerSlug) {
      slug = headerSlug;
    } 
    // 2. Si no hay header, intentar leer del Subdominio (Producción)
    else {
      // Host llega como: "conexa.emplix.com"
      const host = req.get('host') || '';
      const parts = host.split('.');
      
      // Si tenemos subdominio (ej: parts[0] es 'conexa')
      if (parts.length > 2) {
        slug = parts[0];
      }
    }

    // Si no detectamos ninguna empresa, rechazamos la petición
    // (Opcional: podrías dejar pasar si es una ruta pública, pero por seguridad cerremos todo)
    if (!slug) {
      return res.status(400).json({ 
        message: 'No se ha especificado la empresa (Tenant) en la cabecera o subdominio.' 
      });
    }

    // 3. Buscar la empresa en la Base de Datos
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug }
    });

    if (!tenant) {
      return res.status(404).json({ message: `La empresa '${slug}' no existe o está desactivada.` });
    }

    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'El servicio para esta empresa está suspendido.' });
    }

    // 4. ¡ÉXITO! Guardamos el tenant en la petición
    req.tenant = tenant;
    
    next(); // Pasar al siguiente controlador

  } catch (error) {
    console.error('Error en Tenant Middleware:', error);
    res.status(500).json({ message: 'Error interno validando la empresa.' });
  }
};