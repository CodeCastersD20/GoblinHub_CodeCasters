import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PurgeTracesUseCase } from '../../application/use-case/purge-traces.use-case';
import { TracingConfigService } from '../../domain/services/tracing-config.service';

/**
 * Aplica la retención de las trazas.
 *
 * Va a las 03:17 y no a medianoche: esa hora es exactamente cuando se solapan
 * los respaldos y el resto de trabajos del proceso, y una purga que compite por
 * el pool de conexiones con un backup es una purga que se queda sin hacer. El
 * minuto concreto es arbitrario; lo único que importa es que no coincida con
 * nada del resto de la agenda.
 *
 * El resultado lo registra `PurgeTracesUseCase`; aquí solo se captura el fallo
 * para que una tabla caída no deje el trabajo programado lanzando en cada
 * ejecución.
 */
@Injectable()
export class TracesRetentionScheduler {
  private readonly logger = new Logger(TracesRetentionScheduler.name);

  constructor(
    private readonly purgeTracesUseCase: PurgeTracesUseCase,
    private readonly configuracion: TracingConfigService,
  ) {}

  @Cron('17 3 * * *')
  async purgar(): Promise<void> {
    try {
      await this.purgeTracesUseCase.execute(
        this.configuracion.instanteDeVencimiento(new Date()),
      );
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo purgar la trazabilidad: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
