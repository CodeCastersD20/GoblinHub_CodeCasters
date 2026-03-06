import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { RewardRepository } from '../../domain/repositories/reward.repository';
import { CreateRecompensaDto } from '../dtos/create-reward.dto';
import { Recompensa } from '../../domain/entities/reward.entity';
import { TipoRecompensa } from '../../domain/enums/reward.enum';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { UsuarioRepository } from '../../../supabase/domain/repositories/usuario.repository';

@Injectable()
export class CreateRewardUseCase {
  constructor(
    private rewardRepository: RewardRepository,
    private usuarioRepository: UsuarioRepository,
  ) {}

  async createReward(
    data: CreateRecompensaDto,
    id_creador: string,
  ): Promise<Recompensa> {
    try {
      // 1. Validar permisos del usuario
      const rol = await this.usuarioRepository.findRolById(id_creador);

      if (rol !== RolUsuario.admin && rol !== RolUsuario.empleado) {
        throw new ForbiddenException(
          'You do not have permission to create rewards',
        );
      }

      // 2. Validar que no exista ya una recompensa con ese nombre
      const existReward = await this.rewardRepository.findByName(data.nombre);

      if (existReward) {
        throw new HttpException(
          {
            Error: `Reward already exists with name: ${data.nombre}`,
          },
          400,
        );
      }

      // 3. Validar que el Enum sea correcto
      const isValidRewardType = Object.values(TipoRecompensa).includes(
        data.tipo,
      );

      if (!isValidRewardType) {
        throw new HttpException(
          {
            Error: `Invalid reward type: ${data.tipo}`,
          },
          400,
        );
      }

      // 4. Instanciar la entidad
      // Le pasamos 0 como ID porque en la creación la BD lo asigna después
      const reward = new Recompensa(
        0, // id
        data.nombre,
        data.descripcion ?? '',
        data.costo_puntos,
        data.tipo,
        data.valor_descuento,
        data.activa ?? true,
      );

      // 5. Guardar en base de datos
      return this.rewardRepository.create(reward, id_creador);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          Error: 'An error occurred while creating the reward',
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  }
}
