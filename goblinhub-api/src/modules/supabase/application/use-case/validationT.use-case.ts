import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseValidationTokenService {
  /* istanbul ignore next */
  constructor() {}

  async validtoken(token: string) {
    try {
      // Usamos el JWT Secret provisto por Supabase en el panel de API Settings
      const secret = process.env.SUPABASE_JWT_SECRET;
      
      if (!secret) {
        throw new Error('SUPABASE_JWT_SECRET no esta definido en las variables de entorno.');
      }

      // Validación local sincrónica (evita la llamada HTTP a Supabase)
      const decoded = jwt.verify(token, secret) as any;

      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException(`Failed to validate token`);
      }

      // Reconstruimos el objeto user a partir del token para mantener la firma de la interfaz
      const user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        aud: decoded.aud,
        app_metadata: decoded.app_metadata || {},
        user_metadata: decoded.user_metadata || {},
        created_at: new Date(decoded.iat ? decoded.iat * 1000 : Date.now()).toISOString(),
      } as User;

      return {
        success: true,
        user: user,
        message: 'Token is valid (local)',
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to validate token locally');
    }
  }
}
