import { HttpException, Injectable } from '@nestjs/common';
import { RewardRepository } from '../../domain/repositories/reward.repository';

@Injectable()
export class SoftDeleteRewardUseCase {
  constructor(private rewardRepository: RewardRepository) {}

  async softDeleteReward(id: number): Promise<void> {
    try {
      const rewardExistente = await this.rewardRepository.findById(id);

      if (!rewardExistente) {
        throw new HttpException(
          { Error: 'No se encontró la recompensa a eliminar' },
          404,
        );
      }

      await this.rewardRepository.delete(id);
    } catch (error) {
      if (error instanceof HttpException) {
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
