import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { RolUsuario } from '../domain/enums/user.enum';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedRequest } from '../interfaces/types/authenticated-request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no tiene @Roles(), se permite el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User identity not found in request');
    }

    const rol = await this.usuarioRepository.findRolById(userId);

    if (!rol || !requiredRoles.includes(rol)) {
      this.logger.warn(
        `Access denied for user ${userId} — required: [${requiredRoles.join(', ')}], has: ${rol ?? 'none'}`,
      );
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
