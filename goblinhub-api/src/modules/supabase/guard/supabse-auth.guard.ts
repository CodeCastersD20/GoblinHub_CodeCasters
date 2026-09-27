import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../connect/prisma.service';
import { SupabaseValidationTokenService } from '../application/use-case/validationT.use-case';
import {
  SupabaseUser,
  AuthenticatedRequest,
} from '../interfaces/types/authenticated-request.interface';
import { ValidationResult } from '../interfaces/types/validation-result.interface';
import { Redis } from 'ioredis';
import { TracingContextService } from '../../tracing/domain/services/tracing-context.service';
import { TipoSpan } from '../../tracing/domain/enums/tipo-span.enum';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly redisClient: Redis;

  constructor(
    private readonly validationTokenService: SupabaseValidationTokenService,
    private readonly prisma: PrismaService,
    private readonly tracing: TracingContextService,
  ) {
    this.redisClient = new Redis(process.env.REDIS_URL as string);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException(
        'Authorization header is missing or invalid',
      );
    }

    const token = authHeader.split(' ')[1]; // Assuming "Bearer <
    if (!token) {
      throw new UnauthorizedException(
        'Token is missing from Authorization header',
      );
    }
    try {
      // El árbol de spans deja claro dónde se va el tiempo de una autenticación:
      // la llamada a Supabase y la carga del perfil son las dos cosas que
      // pueden tardar, y sin esto solo se vería un único tiempo opaco.
      const authenticated = await this.tracing.registrarSpan(
        'autenticar usuario',
        TipoSpan.auth,
        async (padre) => {
          const result: ValidationResult = await this.tracing.registrarSpan(
            'validar token',
            TipoSpan.auth,
            () => this.validationTokenService.validtoken(token),
            { padre },
          );

          if (!result.success || !result.user) {
            throw new UnauthorizedException('Invalid token');
          }

          const userId = result.user.id;
          const cacheKey = `user:${userId}:profile`;

          // 1. Intentar obtener de la caché (Redis)
          const cachedProfile = await this.redisClient.get(cacheKey);

          let profile: {
            activo: boolean;
            deleted_at: Date | string | null;
          } | null = null;

          if (cachedProfile) {
            profile = JSON.parse(cachedProfile) as {
              activo: boolean;
              deleted_at: Date | string | null;
            };
          } else {
            // 2. Cache Miss: Buscar en la base de datos
            profile = await this.tracing.registrarSpan(
              'cargar perfil',
              TipoSpan.prisma,
              () =>
                this.prisma.usuario.findUnique({
                  where: { id_usuario: userId },
                  select: { activo: true, deleted_at: true },
                }),
              { padre },
            );

            if (profile) {
              // Guardar en Redis con TTL de 15 minutos (900 segundos)
              await this.redisClient.setex(
                cacheKey,
                900,
                JSON.stringify(profile),
              );
            }
          }

          if (!profile || !profile.activo || profile.deleted_at) {
            throw new UnauthorizedException('Usuario no encontrado o inactivo');
          }

          request.user = result.user as SupabaseUser;

          return {
            email: result.user.email ?? result.user.id,
            desdeCache: Boolean(cachedProfile),
          };
        },
      );

      this.logger.log(
        `token validated successfully for user: ${authenticated.email}`,
      );

      return true;
    } catch (error: unknown) {
      const errorMesage = this.extractErrorMessage(error);
      this.logger.error(`Token validation failed: ${errorMesage}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extracts a meaningful error message from various error types.
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (
      error &&
      typeof error == 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return (error as { message: string }).message;
    }

    return 'Unknown error';
  }
}
