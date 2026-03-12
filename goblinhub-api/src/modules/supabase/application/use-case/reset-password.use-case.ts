import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ResetPasswordUseCase {
  /* istanbul ignore next */
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
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

    // Paso 1: validar el recovery JWT con el anon client inyectado.
    const {
      data: { user },
      error: getUserError,
    } = await this.supabase.auth.getUser(accessToken);

    if (getUserError || !user) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Paso 2: actualizar la contraseña con el admin client.
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
