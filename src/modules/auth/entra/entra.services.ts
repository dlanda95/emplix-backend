import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AppError } from '../../../shared/middlewares/error.middleware';

export class EntraService {
  // Opción B: endpoint "common" para validar tokens de cualquier tenant de Azure AD
  private readonly client = jwksClient({
    jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    cache: true,
    cacheMaxAge: 600_000, // 10 minutos
    rateLimit: true,
  });

  private getKey(header: any, callback: any) {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return callback(err ?? new Error('Clave de firma no encontrada'), null);
      callback(null, key.getPublicKey());
    });
  }

  // Valida firma, audience y que el tid del token corresponda al Azure AD de la empresa
  async verifyToken(token: string, expectedAzureTenantId: string): Promise<any> {
    const decoded = await this.verifySignature(token);

    // Validar que el token pertenece al Azure AD correcto (seguridad cross-company)
    if (!decoded.tid || decoded.tid !== expectedAzureTenantId) {
      throw new AppError(
        'Este usuario no pertenece al directorio de Azure de esta empresa.',
        403,
        'AZURE_TENANT_MISMATCH',
      );
    }

    return decoded;
  }

  private verifySignature(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        {
          audience: process.env.AZURE_CLIENT_ID,
          algorithms: ['RS256'],
          // No verificamos issuer aquí: en multi-tenant varía por cliente.
          // La validación del tid en verifyToken reemplaza esa garantía.
        },
        (err, decoded) => {
          if (err) {
            reject(new AppError('Token de Microsoft inválido o expirado.', 401, 'INVALID_MICROSOFT_TOKEN'));
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }
}
