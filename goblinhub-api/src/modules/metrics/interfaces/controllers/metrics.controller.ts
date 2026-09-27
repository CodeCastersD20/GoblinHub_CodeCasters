import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GetMetricsUseCase } from '../../application/use-case/get-metrics.use-case';
import {
  GetBackupFreshnessUseCase,
  type FreshnessBackup,
} from '../../application/use-case/get-backup-freshness.use-case';

/**
 * `GET /metrics` expone el registro en formato de exposición de Prometheus.
 *
 * Va deliberadamente **sin** `SupabaseAuthGuard`: Prometheus no sabe
 * autenticarse con el JWT de Supabase, y el AC de #214 pide que el entorno de
 * despliegue se pueda sondear. El endpoint es de solo lectura y no cruza el CORS
 * del navegador (`main.ts` solo habilita el origen del frontend), así que
 * exponerlo no entrega datos de negocio; el riesgo asumido —que un tercero
 * puede ver nombres de rutas y percentiles de latencia— queda documentado en
 * `docs/RUNBOOK_MONITOREO.md`.
 *
 * `@SkipThrottle()` es imprescindible: con el límite global de 10 req/min por
 * IP, el scrape de Prometheus (4/min) y las sondas de `/healthz` competirían por
 * el mismo cupo y un 429 se leería como una caída del servicio.
 */
@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(
    private readonly getMetricsUseCase: GetMetricsUseCase,
    private readonly getBackupFreshnessUseCase: GetBackupFreshnessUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async metrics(
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<string> {
    respuesta.setHeader('Content-Type', this.getMetricsUseCase.contentType());
    return this.getMetricsUseCase.execute();
  }

  /**
   * Ayuda operativa para el turno de guardia: qué tan viejo es el último
   * respaldo y si ya se superó el RPO de 24 h (SLA S6). El valor de la misma
   * señal está en `goblinhub_backup_last_success_timestamp_seconds`; aquí sale
   * en JSON, legible sin PromQL.
   */
  @Get('backup-freshness')
  @HttpCode(HttpStatus.OK)
  backupFreshness(): FreshnessBackup {
    return this.getBackupFreshnessUseCase.execute();
  }
}
