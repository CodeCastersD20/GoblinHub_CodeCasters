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
    // 1. Crear usuario en Supabase Auth
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.user) {
      throw new BadRequestException(
        error?.message ?? 'Error al crear el usuario en Supabase',
      );
    }

    const supabaseUserId = data.user.id;

    // 2. Crear perfil en la tabla `usuarios` usando el mismo UUID
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
        message: 'Usuario registrado exitosamente',
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
      // Rollback: eliminar usuario de Supabase para evitar estado inconsistente
      // NOTA: requiere SUPABASE_SERVICE_ROLE_KEY para usar auth.admin.deleteUser
      this.logger.error(
        `Fallo al crear perfil en BD para el usuario ${supabaseUserId}. ` +
          `El usuario fue creado en Supabase Auth. Rollback manual requerido.`,
        prismaError,
      );
      throw new InternalServerErrorException(
        'Error al guardar el perfil del usuario. Por favor contacta soporte.',
      );
    }
  }
}
