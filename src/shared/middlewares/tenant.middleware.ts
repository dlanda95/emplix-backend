import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma'; 
import { TenantStatus } from '@prisma/client'; // <--- IMPORTANTE: Usamos el Enum real

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let slug: string | undefined;

    // 1. ESTRATEGIA DE DETECCIÓN (Tu lógica está perfecta)
    const headerSlug = req.headers['x-tenant-slug'] as string;
    if (headerSlug) {
      slug = headerSlug;
    } else {
      const host = req.get('host') || '';
      const parts = host.split('.');
      if (parts.length > 2) {
        slug = parts[0];
      }
    }

    if (!slug) {
      return res.status(400).json({ 
        message: 'No se ha especificado la empresa (Tenant) en la cabecera o subdominio.' 
      });
    }

    // 2. Buscar la empresa
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug }
    });

    if (!tenant) {
      return res.status(404).json({ message: `La empresa '${slug}' no existe.` });
    }

    // 3. DEFENSA CONTRA MOROSOS / SUSPENDIDOS 🛡️
    // Usamos el Enum para ser estrictos y evitar errores de tipeo.
    if (tenant.status === TenantStatus.SUSPENDED) {
      console.warn(`⛔ Alerta: Intento de acceso a Tenant SUSPENDIDO: ${slug}`);
      
      // Retornamos 402 (Payment Required)
      // Esto ayuda al Front a saber exactamente qué pantalla mostrar (ej: "Contacte a Cobranzas")
      return res.status(402).json({ 
        message: 'El servicio para esta organización se encuentra suspendido. Contacte al administrador.',
        code: 'TENANT_SUSPENDED' 
      });
    }

    // Validación general para cualquier otro estado que no sea ACTIVE (ej: ARCHIVED)
    if (tenant.status !== TenantStatus.ACTIVE) {
      return res.status(403).json({ message: 'Esta organización no está activa actualmente.' });
    }

    // 4. ¡ÉXITO!
    req.tenant = tenant;
    next(); 

  } catch (error) {
    console.error('Error en Tenant Middleware:', error);
    res.status(500).json({ message: 'Error interno validando la empresa.' });
  }
};