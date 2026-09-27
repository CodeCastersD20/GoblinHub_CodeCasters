import { MetricsProbeScheduler } from './metrics-probe.scheduler';
import type { MetricsService } from '../services/metrics.service';
import type { HealthService } from '../../../health/health.service';
import type { PrismaService } from '../../../../connect/prisma.service';

describe('MetricsProbeScheduler', () => {
  let metricsService: jest.Mocked<
    Pick<
      MetricsService,
      'registrarResultadoReadiness' | 'registrarPoolConexiones'
    >
  >;
  let healthService: { readiness: jest.Mock };
  let prismaService: { poolStats: { enUso: number; maximo: number } };
  let scheduler: MetricsProbeScheduler;

  beforeEach(() => {
    metricsService = {
      registrarResultadoReadiness: jest.fn(),
      registrarPoolConexiones: jest.fn(),
    };
    healthService = {
      readiness: jest.fn().mockResolvedValue({ estado: 'ok' }),
    };
    prismaService = { poolStats: { enUso: 2, maximo: 10 } };
    scheduler = new MetricsProbeScheduler(
      metricsService as unknown as MetricsService,
      healthService as unknown as HealthService,
      prismaService as unknown as PrismaService,
    );
  });

  it('publica readiness ok cuando las dependencias responden', async () => {
    await scheduler.sondearReadiness();

    expect(metricsService.registrarResultadoReadiness).toHaveBeenCalledWith(
      'ok',
    );
  });

  it('publica readiness degradado sin propagar el fallo', async () => {
    healthService.readiness.mockResolvedValue({ estado: 'degraded' });

    await scheduler.sondearReadiness();

    expect(metricsService.registrarResultadoReadiness).toHaveBeenCalledWith(
      'degraded',
    );
  });

  it('publica readiness degradado si la sonda lanza', async () => {
    healthService.readiness.mockRejectedValue(new Error('timeout'));

    await expect(scheduler.sondearReadiness()).resolves.toBeUndefined();
    expect(metricsService.registrarResultadoReadiness).toHaveBeenCalledWith(
      'degraded',
    );
  });

  it('publica el pool de conexiones en uso y su máximo', () => {
    scheduler.sondearPool();

    expect(metricsService.registrarPoolConexiones).toHaveBeenCalledWith(2, 10);
  });

  it('no propaga el fallo si el pool no se puede leer', () => {
    Object.defineProperty(prismaService, 'poolStats', {
      get: () => {
        throw new Error('pool no inicializado');
      },
    });

    expect(() => scheduler.sondearPool()).not.toThrow();
    expect(metricsService.registrarPoolConexiones).not.toHaveBeenCalled();
  });
});
