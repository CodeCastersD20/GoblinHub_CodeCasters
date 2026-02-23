import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseGetUserProfileService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async getUserProfile(token: string) {
    try {
      const { data: user, error } = await this.supabase.auth.getUser(token);

      if (error) {
        throw new UnauthorizedException(
          `Failed to retrieve user profile: ${error.message}`,
        );
      }

      if (!user || !user.user) {
        throw new UnauthorizedException(
          'Failed to retrieve user profile: No user data returned',
        );
      }

      return {
        success: true,
        user: {
          id: user.user.id,
          email: user.user.email,
          createdAt: user.user.created_at,
        },
        message: 'User profile retrieved successfully',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
    }
  }
}
