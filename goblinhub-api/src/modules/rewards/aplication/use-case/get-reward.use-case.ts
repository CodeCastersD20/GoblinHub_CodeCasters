import { HttpException, Injectable } from '@nestjs/common';
import { Recompensa } from '../../domain/entities/reward.entity';
import { RewardRepository } from '../../domain/repositories/reward.repository';

@Injectable()
export class GetRewardUseCase {
  constructor(private rewardRepository: RewardRepository) {}

  async getAllRewards(): Promise<Recompensa[]> {
    try {
      const rewards = await this.rewardRepository.findAll();

      if (!rewards.length) {
        throw new HttpException(
          {
            Error: 'No se encontraron recompensas',
          },
          404,
        );
      }
      return rewards;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener las recompensas: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  async getByIdReward(id: number): Promise<Recompensa> {
    try {
      const reward = await this.rewardRepository.findById(id);

      if (!reward) {
        throw new HttpException({ Error: 'No se encontró la recompensa' }, 404);
      }

      return reward;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener la recompensa: ${(error as Error).message}`,
        },
        500,
      );
    }
  }

  async getByNameReward(nombre: string): Promise<Recompensa> {
    try {
      const reward = await this.rewardRepository.findByName(nombre);

      if (!reward) {
        throw new HttpException(
          { Error: `No se encontró la recompensa con el nombre: ${nombre}` },
          404,
        );
      }

      return reward;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al obtener la recompensa por nombre: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
