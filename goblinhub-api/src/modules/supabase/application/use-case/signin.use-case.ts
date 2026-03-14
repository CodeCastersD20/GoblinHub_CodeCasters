import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../../connect/prisma.service';

export interface SignInResult {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class SignInUseCase {
  private readonly logger = new Logger(SignInUseCase.name);

  /* istanbul ignore next */
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async signInWithCredentials(
    email: string,
    password: string,
  ): Promise<SignInResult> {
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

    await this.ensureUserCanLogin(data.session.user?.id);

    await this.registerLoginLog(data.session.user?.id);

    // Solo devolvemos los tokens — sin datos del usuario
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  private async registerLoginLog(userId?: string): Promise<void> {
    if (!this.prisma || !userId) return;

    try {
      await this.prisma.logs_Actividad.create({
        data: {
          tipo: 'success',
          accion: 'auth.signin',
          mensaje: 'Inicio de sesion exitoso',
          id_usuario: userId,
          datos_extra: { source: 'web' },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo registrar log de login: ${message}`);
    }
  }

  private async ensureUserCanLogin(userId?: string): Promise<void> {
    if (!this.prisma || !userId) return;

    const profile = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        activo: true,
        deleted_at: true,
      },
    });

    if (!profile || !profile.activo || profile.deleted_at) {
      throw new BadRequestException('Usuario no encontrado');
    }
  }
}
