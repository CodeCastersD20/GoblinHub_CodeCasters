import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseCreateTestUserService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async signInTestuser(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new BadRequestException(`Error signin in: ${error.message}`);
      }
      if (!data.session) {
        throw new BadRequestException('No session created');
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        access_token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        message: 'Login successful',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Login failed');
    }
  }

  listAuthUsers() {
    try {
      // Note: listing users requires the Admin API
      // This method is a placeholder for now
      return {
        success: true,
        message: 'To see all users you need admin access to Supabase',
        instructions:
          'Go to your Supabase dashboard > Authentication > Users to see created users',
      };
    } catch {
      throw new BadRequestException('Failed to retrieve user list');
    }
  }

  // async createTestUser(email: string, password: string) {
  //   try {
  //     // crea el usuario en la tabla auth
  //     const { data, error } = await this.supabase.auth.signUp({
  //       email,
  //       password,
  //       options: {
  //         // In testing mode, you can auto-confirm the email
  //         emailRedirectTo: undefined,
  //       },
  //     });

  //     if (error) {
  //       throw new BadRequestException(`Error Creating User: ${error.message}`);
  //     }

  //     if (!data.user) {
  //       throw new BadRequestException('User not created');
  //     }

  //     return {
  //       success: true,
  //       user: {
  //         id: data.user.id,
  //         email: data.user.email,
  //         create_at: data.user.created_at,
  //       },
  //       session: data.session,
  //       message: 'User created successfully',
  //     };
  //   } catch (error) {
  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new BadRequestException('Error creating test user');
  //   }
  // }
}
