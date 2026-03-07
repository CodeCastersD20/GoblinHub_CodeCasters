import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { UpdateRecompensaDto } from '../dtos/update-reward.dto';
import { Recompensa } from '../../domain/entities/reward.entity';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Injectable()
export class UpdateRewardUseCase {
  constructor(
    private rewardRepository: RewardRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async updateReward(
    id: number,
    data: UpdateRecompensaDto,
    id_usuario: string,
  ): Promise<Recompensa> {
    try {
      // 1. Validar rol
      const rol = await this.usuarioRepository.findRolById(id_usuario);
      const isAdmin = rol === RolUsuario.admin;

      if (!isAdmin && rol !== RolUsuario.empleado) {
        throw new ForbiddenException(
          'No tienes permisos para actualizar recompensas',
        );
      }

      // 2. Verificamos que la recompensa exista por su ID
      const existReward = await this.rewardRepository.findById(id);

      if (!existReward) {
        throw new HttpException({ Error: 'No se encontró la recompensa' }, 404);
      }

      // 3. Verificar propiedad si es empleado
      if (!isAdmin && existReward.id_creador !== id_usuario) {
        throw new ForbiddenException(
          'Solo puedes editar recompensas que hayas creado tú',
        );
      }

      // 4. Construimos la entidad actualizada usando Nullish Coalescing (??)
      const updatedReward = new Recompensa(
        existReward.id,
        data.nombre ?? existReward.nombre,
        data.descripcion ?? existReward.descripcion,
        data.costo_puntos ?? existReward.costo_puntos,
        data.tipo ?? existReward.tipo,
        data.valor_descuento ?? existReward.valor_descuento,
        data.activa ?? existReward.activa,
      );

      // 5. Guardamos los cambios
      return await this.rewardRepository.update(id, updatedReward);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
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
