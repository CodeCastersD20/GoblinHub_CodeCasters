import { Injectable } from '@nestjs/common';
import { MetricsService } from '../../infrastructure/services/metrics.service';

export interface FreshnessBackup {
  /** Epoch en segundos del último respaldo exitoso. */
  ultimoExitosoEpoch: number | null;
  /** Segundos transcurridos desde ese respaldo. */
  antiguedadSegundos: number | null;
  /** `true` si la antigüedad supera el RPO de 24 h acordado (SLA S6). */
  rpoSuperado: boolean;
}

export const RPO_SEGUNDOS = 86_400;

/**
 * Antigüedad del último respaldo exitoso (M-12). Hoy el cron solo escribe en
 * el log, así que una cadena de respaldos fallidos es indistinguible de una
 * cadena inexistente: esta métrica la convierte en algo observable.
 */
@Injectable()
export class GetBackupFreshnessUseCase {
  constructor(private readonly metricsService: MetricsService) {}

  execute(): FreshnessBackup {
    const { ultimoBackupExitoso } = this.metricsService.metricSet();

    if (ultimoBackupExitoso === null) {
      return {
        ultimoExitosoEpoch: null,
        antiguedadSegundos: null,
        rpoSuperado: true,
      };
    }

    const antiguedadSegundos = Math.max(
      0,
      Math.floor(Date.now() / 1000) - ultimoBackupExitoso,
    );

    return {
      ultimoExitosoEpoch: ultimoBackupExitoso,
      antiguedadSegundos,
      rpoSuperado: antiguedadSegundos > RPO_SEGUNDOS,
    };
  }
}
