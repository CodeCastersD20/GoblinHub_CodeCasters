import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SignInResult {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async execute(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException('Correo o contraseña incorrectos');
    }
    if (!data.session) {
      throw new BadRequestException('No se pudo crear la sesión');
    }

    // Solo devolvemos los tokens — sin datos del usuario
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }
}
