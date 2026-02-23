import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseValidationTokenService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async validtoken(token: string) {
    try {
      const { data: user, error } = await this.supabase.auth.getUser(token);

      if (error || !user || !user.user) {
        throw new UnauthorizedException(`Failed to validate token`);
      }

      return {
        success: true,
        user: user.user,
        message: 'Token is valid',
      };
    } catch {
      throw new UnauthorizedException('Failed to validate token');
    }
  }
}
