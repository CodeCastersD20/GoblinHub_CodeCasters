import { TipoRecompensa } from '../../domain/enums/reward.enum';
import { TipoRecompensa as PrismaTipoRecompensa } from '@prisma/client';

export class TipoRecompensaMapper {
  static toPrisma(tipo: TipoRecompensa): PrismaTipoRecompensa {
    return tipo.toLowerCase() as unknown as PrismaTipoRecompensa;
  }

  static toDomain(tipo: PrismaTipoRecompensa): TipoRecompensa {
    return tipo as unknown as TipoRecompensa;
  }
}
