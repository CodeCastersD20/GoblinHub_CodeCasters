import { GetMetricsUseCase } from './get-metrics.use-case';
import type { MetricsService } from '../../infrastructure/services/metrics.service';

describe('GetMetricsUseCase', () => {
  const exposition = '# HELP goblinhub_health_ready 1\n';
  let metricsService: jest.Mocked<
    Pick<MetricsService, 'exposition' | 'contentType' | 'metricSet'>
  >;
  let useCase: GetMetricsUseCase;

  beforeEach(() => {
    metricsService = {
      exposition: jest.fn().mockResolvedValue(exposition),
      contentType: jest.fn().mockReturnValue('text/plain; version=0.0.4'),
      metricSet: jest.fn().mockReturnValue({}),
    };
    useCase = new GetMetricsUseCase(
      metricsService as unknown as MetricsService,
    );
  });

  it('delega en el servicio la lectura del registro', async () => {
    await expect(useCase.execute()).resolves.toBe(exposition);
    expect(metricsService.exposition).toHaveBeenCalledTimes(1);
  });

  it('expone el content type de Prometheus para la cabecera HTTP', () => {
    expect(useCase.contentType()).toBe('text/plain; version=0.0.4');
  });
});
