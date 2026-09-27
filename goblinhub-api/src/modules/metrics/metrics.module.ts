import { Module } from '@nestjs/common';
import { MetricsController } from './interfaces/controllers/metrics.controller';
import { MetricsService } from './infrastructure/services/metrics.service';
import { MetricsInterceptor } from './infrastructure/interceptors/metrics.interceptor';
import { MetricsProbeScheduler } from './infrastructure/scheduler/metrics-probe.scheduler';
import { GetMetricsUseCase } from './application/use-case/get-metrics.use-case';
import { GetBackupFreshnessUseCase } from './application/use-case/get-backup-freshness.use-case';
import { HealthModule } from '../health/health.module';
import { PrismaModule } from '../../connect/prisma.module';

/**
 * Módulo de métricas de monitoreo (spec `005-modulo-metricas-monitoreo`).
 *
 * Exporta `MetricsService` para que `BackupModule` publique la marca de tiempo
 * de cada respaldo exitoso (M-12) sin crear un ciclo de dependencias: este
 * módulo no importa `BackupModule`, solo al revés.
 */
@Module({
  imports: [PrismaModule, HealthModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsProbeScheduler,
    GetMetricsUseCase,
    GetBackupFreshnessUseCase,
    MetricsInterceptor,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
