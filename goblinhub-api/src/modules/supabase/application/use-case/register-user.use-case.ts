import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../../connect/prisma.service';
import { RegisterUserDto } from '../dto/auth.dto';
import { NivelExperiencia } from '../../domain/enums/user.enum';

@Injectable()
export class SupabaseRegisterUserService {
  private readonly logger = new Logger(SupabaseRegisterUserService.name);

  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterUserDto) {
    // 1. Create user in Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.user) {
      throw new BadRequestException(
        error?.message ?? 'Failed to create user in Supabase',
      );
    }

    const supabaseUserId = data.user.id;

    // 2. Create profile in `usuarios` table using the same UUID
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          id_usuario: supabaseUserId,
          nombre: dto.nombre,
          apellidos: dto.apellidos,
          telefono: dto.telefono ?? null,
          fecha_nacimiento: new Date(dto.fecha_nacimiento),
          bio: dto.bio ?? null,
          nivel_experiencia: dto.nivel_experiencia ?? NivelExperiencia.novato,
        },
      });

      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: usuario.id_usuario,
          email: data.user.email,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          rol: usuario.rol,
          nivel_experiencia: usuario.nivel_experiencia,
          created_at: usuario.created_at,
        },
        session: data.session,
      };
    } catch (prismaError) {
      // Rollback: delete user from Supabase to avoid inconsistent state
      // NOTE: requires SUPABASE_SERVICE_ROLE_KEY to use auth.admin.deleteUser
      this.logger.error(
        `Failed to create profile in DB for user ${supabaseUserId}. ` +
          `User was created in Supabase Auth. Manual rollback required.`,
        prismaError,
      );
      throw new InternalServerErrorException(
        'Failed to save user profile. Please contact support.',
      );
    }
  }
}
