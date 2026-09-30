import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpireEventsUseCase } from '../../application/use-case/expire-events.use-case';
import { AuditoriaService } from '../../../auditoria/domain/services/auditoria.service';

@Injectable()
export class EventExpirationScheduler {
  private readonly logger = new Logger(EventExpirationScheduler.name);

  constructor(
    private readonly expireEventsUseCase: ExpireEventsUseCase,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Runs every minute to check for events whose hora_fin (or hora_inicio) has passed
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredEvents(): Promise<void> {
    this.logger.debug('Checking for expired events...');

    try {
      const expirados =
        await this.expireEventsUseCase.expireAndSoftDeleteEvents();

      // Solo cuando ha expirado algo. El cron corre cada minuto y registrar
      // una fila por ejecución llenaría la tabla con 1.440 registros diarios
      // que no cuentan nada: la auditoría deja constancia de la acción, no del
      // hecho de que el proceso siga vivo (#212).
      if (expirados > 0) {
        await this.auditoria.registrarProceso({
          accion: 'EXPIRACION',
          recurso: 'eventos',
          resultado: 'exitoso',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo al expirar eventos caducados: ${message}`);

      await this.auditoria.registrarProceso({
        accion: 'EXPIRACION',
        recurso: 'eventos',
        resultado: 'fallido',
      });
    }
  }
}
