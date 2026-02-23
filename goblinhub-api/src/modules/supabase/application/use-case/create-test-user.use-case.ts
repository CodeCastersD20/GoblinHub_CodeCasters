import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseCreateTestUserService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createTestUser(email: string, password: string) {
    try {
      // crea el usuario en la tabla auth
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          // En modo testing, puedes confirmar automáticamente el email
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        throw new BadRequestException(`Error Creating User: ${error.message}`);
      }

      if (!data.user) {
        throw new BadRequestException('User not created');
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          create_at: data.user.created_at,
        },
        session: data.session,
        message: 'Usuario creado exitosamente',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear usuario de prueba');
    }
  }

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
        message: 'Login exitoso',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al hacer login');
    }
  }

  listAuthUsers() {
    try {
      // Nota: Para listar usuarios necesitarías usar el Admin API
      // Por ahora, este método es un placeholder
      return {
        success: true,
        message:
          'Para ver todos los usuarios necesitas acceso admin a Supabase',
        instructions:
          'Ve a tu panel de Supabase > Authentication > Users para ver los usuarios creados',
      };
    } catch {
      throw new BadRequestException('Error al obtener lista de usuarios');
    }
  }
}
