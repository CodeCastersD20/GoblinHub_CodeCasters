import { Injectable } from '@nestjs/common';
import { MetricsService } from '../../infrastructure/services/metrics.service';
import type { MetricSet } from '../../domain/entities/metric-set.entity';

/**
 * Entrega el cuerpo de `GET /metrics`. La interfaz depende de este caso de uso
 * y no de `prom-client`, para que el formato de exposición sea un detalle de la
 * infraestructura.
 */
@Injectable()
export class GetMetricsUseCase {
  constructor(private readonly metricsService: MetricsService) {}

  async execute(): Promise<string> {
    return this.metricsService.exposition();
  }

  contentType(): string {
    return this.metricsService.contentType();
  }

  metricSet(): MetricSet {
    return this.metricsService.metricSet();
  }
}
