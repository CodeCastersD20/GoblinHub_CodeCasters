import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { HealthService } from '../../../health/health.service';
import { PrismaService } from '../../../../connect/prisma.service';
import { MetricsService } from '../services/metrics.service';

export const INTERVALO_SONDA_READINESS_MS = 30_000;
export const INTERVALO_SONDA_POOL_MS = 15_000;

/**
 * Sondea las dependencias y publica M-11 (pool de Prisma) y M-13
 * (readiness).
 *
 * La sonda de readiness no reinicia nada: solo refleja el estado. Si el
 * proceso pierde PostgreSQL pero sigue vivo, reiniciarlo en cascada empeoraría
 * el incidente, así que la alerta de M-13 es de diagnóstico, no de remediación.
 */
@Injectable()
export class MetricsProbeScheduler {
  private readonly logger = new Logger(MetricsProbeScheduler.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly healthService: HealthService,
    private readonly prismaService: PrismaService,
  ) {}

  @Interval(INTERVALO_SONDA_READINESS_MS)
  async sondearReadiness(): Promise<void> {
    try {
      const reporte = await this.healthService.readiness();
      this.metricsService.registrarResultadoReadiness(reporte.estado);
    } catch (error: unknown) {
      this.logger.warn(
        `La sonda de readiness falló: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.metricsService.registrarResultadoReadiness('degraded');
    }
  }

  @Interval(INTERVALO_SONDA_POOL_MS)
  sondearPool(): void {
    try {
      const { enUso, maximo } = this.prismaService.poolStats;
      this.metricsService.registrarPoolConexiones(enUso, maximo);
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo leer el pool de Prisma: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
