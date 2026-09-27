import { Test } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { GetMetricsUseCase } from '../../application/use-case/get-metrics.use-case';
import { GetBackupFreshnessUseCase } from '../../application/use-case/get-backup-freshness.use-case';

describe('MetricsController', () => {
  const exposition = 'goblinhub_health_ready 1\n';
  const getMetricsUseCase = {
    execute: jest.fn().mockResolvedValue(exposition),
    contentType: jest.fn().mockReturnValue('text/plain; version=0.0.4'),
  };
  const getBackupFreshnessUseCase = {
    execute: jest.fn().mockReturnValue({
      ultimoExitosoEpoch: 1_800_000_000,
      antiguedadSegundos: 600,
      rpoSuperado: false,
    }),
  };

  let controller: MetricsController;
  let respuesta: { setHeader: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    const modulo = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: GetMetricsUseCase, useValue: getMetricsUseCase },
        {
          provide: GetBackupFreshnessUseCase,
          useValue: getBackupFreshnessUseCase,
        },
      ],
    }).compile();

    controller = modulo.get(MetricsController);
    respuesta = { setHeader: jest.fn() };
  });

  it('GET /metrics devuelve la exposición y fija el content type de Prometheus', async () => {
    const cuerpo = await controller.metrics(respuesta as never);

    expect(cuerpo).toBe(exposition);
    expect(respuesta.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4',
    );
  });

  it('GET /metrics/backup-freshness devuelve la antigüedad del último respaldo', () => {
    expect(controller.backupFreshness()).toEqual({
      ultimoExitosoEpoch: 1_800_000_000,
      antiguedadSegundos: 600,
      rpoSuperado: false,
    });
  });
});
