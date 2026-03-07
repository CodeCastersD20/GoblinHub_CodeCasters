import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async forgotPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.SUPABASE_RESET_PASSWORD_URL,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { message: 'Correo de recuperación enviado' };
  }
}
