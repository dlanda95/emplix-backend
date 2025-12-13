import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import { AppError } from '../../../shared/middlewares/error.middleware';

export class EntraService {
  
  // Cliente para obtener las llaves de firma de Microsoft dinámicamente
  private client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
  });

  private getKey(header: any, callback: any) {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        callback(err, null);
      } else {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      }
    });
  }

  // Valida el token que viene del Frontend
  async verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Usamos 'bind' para no perder el contexto de 'this.client'
      jwt.verify(token, this.getKey.bind(this), {
        audience: process.env.AZURE_CLIENT_ID, // Validar que el token sea para ESTA app
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`, // Validar Tenant
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) {
          console.error("Error validando token Microsoft:", err.message);
          reject(new AppError('Token de Microsoft inválido o expirado', 401));
        } else {
          resolve(decoded);
        }
      });
    });
  }
}