import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async forgotPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.SUPABASE_RESET_PASSWORD_URL,
    });
    if (error) {
      // Log internally but never expose the error — prevents user enumeration
      this.logger.warn(`forgot-password silenced error: ${error.message}`);
    }
    return {
      message: 'If the email is registered, you will receive a recovery link.',
    };
  }
}
