import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService, ReporteReadiness } from '../health.service';

describe('HealthController', () => {
  const reporteOk: ReporteReadiness = {
    estado: 'ok',
    timestamp: '2026-09-26T00:00:00.000Z',
    uptimeSeconds: 120,
    dependencias: {
      postgres: { estado: 'up', latenciaMs: 4 },
      redis: { estado: 'up', latenciaMs: 2 },
    },
  };

  let healthService: {
    liveness: jest.Mock;
    readiness: jest.Mock;
  };
  let controller: HealthController;

  beforeEach(() => {
    healthService = {
      liveness: jest.fn().mockReturnValue({
        estado: 'ok',
        timestamp: '2026-09-26T00:00:00.000Z',
        uptimeSeconds: 120,
      }),
      readiness: jest.fn().mockResolvedValue(reporteOk),
    };
    controller = new HealthController(
      healthService as unknown as HealthService,
    );
  });

  it('GET /healthz devuelve 200 con el estado del proceso', () => {
    const resultado = controller.liveness();

    expect(resultado.estado).toBe('ok');
    expect(healthService.liveness).toHaveBeenCalledTimes(1);
  });

  it('GET /health devuelve 200 y el reporte cuando las dependencias responden', async () => {
    const resultado = await controller.readiness();

    expect(resultado).toEqual(reporteOk);
  });

  it('GET /health lanza 503 cuando una dependencia no responde', async () => {
    const reporteDegraded: ReporteReadiness = {
      ...reporteOk,
      estado: 'degraded',
      dependencias: {
        postgres: {
          estado: 'down',
          latenciaMs: 2000,
          detalle: 'timeout tras 2000 ms',
        },
        redis: { estado: 'up', latenciaMs: 3 },
      },
    };
    healthService.readiness.mockResolvedValue(reporteDegraded);

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.readiness()).rejects.toMatchObject({
      response: reporteDegraded,
      status: 503,
    });
  });
});
