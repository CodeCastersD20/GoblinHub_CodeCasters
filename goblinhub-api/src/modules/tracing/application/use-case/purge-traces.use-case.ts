import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRAZA_REPOSITORY,
  TrazaRepository,
} from '../../domain/repositories/traza.repository';

/**
 * Lo que devuelve la purga. El recuento se devuelve porque una purga que no dice
 * cuántas filas tocó no se puede distinguir de una que no encontró nada, y en
 * un trabajo programado esa es exactamente la diferencia entre «todo bien» y
 * «no se está borrando nada».
 */
export type ResultadoPurga = {
  trazasEliminadas: number;
};

/**
 * Elimina las trazas cuyo inicio es anterior al periodo de retención.
 *
 * Los spans no se cuentan: se van en cascada con su traza, y el numero que
 * interesa para dimensionar la base de datos es el de trazas.
 */
@Injectable()
export class PurgeTracesUseCase {
  private readonly logger = new Logger(PurgeTracesUseCase.name);

  constructor(
    @Inject(TRAZA_REPOSITORY)
    private readonly trazaRepository: TrazaRepository,
  ) {}

  async execute(anteriorA: Date): Promise<ResultadoPurga> {
    const { count } = await this.trazaRepository.purgarVencidas(anteriorA);

    this.logger.log(
      count === 0
        ? 'Purga de trazabilidad: ninguna traza vencida.'
        : `Purga de trazabilidad: ${count} traza(s) anterior(es) a ${anteriorA.toISOString()} eliminada(s).`,
    );

    return { trazasEliminadas: count };
  }
}
