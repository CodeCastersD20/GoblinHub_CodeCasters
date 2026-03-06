import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Injectable()
export class SoftDeleteRewardUseCase {
  constructor(
    private rewardRepository: RewardRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async softDeleteReward(id: number, id_usuario: string): Promise<void> {
    try {
      // 1. Validar que solo admin puede eliminar
      const rol = await this.usuarioRepository.findRolById(id_usuario);

      if (rol !== RolUsuario.admin) {
        throw new ForbiddenException(
          'Solo un administrador puede eliminar recompensas',
        );
      }

      const rewardExistente = await this.rewardRepository.findById(id);

      if (!rewardExistente) {
        throw new HttpException(
          { Error: 'No se encontró la recompensa a eliminar' },
          404,
        );
      }

      await this.rewardRepository.delete(id);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al eliminar la recompensa: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
