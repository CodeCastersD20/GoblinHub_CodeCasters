import { HttpException, Injectable } from '@nestjs/common';
import { UpdateRecompensaDto } from '../dtos/update-reward.dto';
import { Recompensa } from '../../domain/entities/reward.entity';
import { RewardRepository } from '../../domain/repositories/reward.repository';

@Injectable()
export class UpdateRewardUseCase {
  constructor(private rewardRepository: RewardRepository) {}

  async updateReward(
    id: number,
    data: UpdateRecompensaDto,
  ): Promise<Recompensa> {
    try {
      // 1. Verificamos que la recompensa exista por su ID
      const existReward = await this.rewardRepository.findById(id);

      if (!existReward) {
        throw new HttpException({ Error: 'No se encontró la recompensa' }, 404);
      }

      // 2. Construimos la entidad actualizada usando Nullish Coalescing (??)
      // Si "data" trae el campo, lo usamos; si no, conservamos el de "existReward"
      const updatedReward = new Recompensa(
        existReward.id,
        data.nombre ?? existReward.nombre,
        data.descripcion ?? existReward.descripcion,
        data.costo_puntos ?? existReward.costo_puntos,
        data.tipo ?? existReward.tipo,
        data.valor_descuento ?? existReward.valor_descuento,
        data.activa ?? existReward.activa,
      );

      // 3. Guardamos los cambios
      return await this.rewardRepository.update(id, updatedReward);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          Error: `Error al actualizar la recompensa: ${(error as Error).message}`,
        },
        500,
      );
    }
  }
}
