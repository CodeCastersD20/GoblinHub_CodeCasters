import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('SUPABASE_ADMIN_CLIENT')
    private readonly supabaseAdmin: SupabaseClient,
  ) {}

  async resetPassword(
    accessToken: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new BadRequestException('Configuración de Supabase incompleta');
    }

    // Paso 1: usar el anon client para validar el recovery JWT.
    // supabase.auth.getUser(jwt) envía GET /auth/v1/user con
    // Authorization: Bearer <jwt> — funciona correctamente con tokens de recovery.
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: getUserError,
    } = await anonClient.auth.getUser(accessToken);

    if (getUserError || !user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Paso 2: actualizar la contraseña con el admin client.
    // Esta es la única vía 100% confiable desde un backend NestJS.
    const { error: updateError } =
      await this.supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return { message: 'Contraseña actualizada correctamente' };
  }
}
