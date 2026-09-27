import {
  GetBackupFreshnessUseCase,
  RPO_SEGUNDOS,
} from './get-backup-freshness.use-case';
import type { MetricsService } from '../../infrastructure/services/metrics.service';

describe('GetBackupFreshnessUseCase', () => {
  const ahora = 1_800_000_000_000;
  let metricSet: { ultimoBackupExitoso: number | null };
  let useCase: GetBackupFreshnessUseCase;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(ahora);
    metricSet = { ultimoBackupExitoso: null };
    useCase = new GetBackupFreshnessUseCase({
      metricSet: () => metricSet,
    } as unknown as MetricsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marca el RPO como superado cuando nunca hubo un respaldo exitoso', () => {
    const resultado = useCase.execute();

    expect(resultado).toEqual({
      ultimoExitosoEpoch: null,
      antiguedadSegundos: null,
      rpoSuperado: true,
    });
  });

  it('informa la antigüedad en segundos desde el último respaldo', () => {
    metricSet.ultimoBackupExitoso = Math.floor(ahora / 1000) - 3_600;

    const resultado = useCase.execute();

    expect(resultado.antiguedadSegundos).toBe(3_600);
    expect(resultado.rpoSuperado).toBe(false);
  });

  it('superó el RPO de 24 h cuando el respaldo es más viejo que eso', () => {
    metricSet.ultimoBackupExitoso =
      Math.floor(ahora / 1000) - (RPO_SEGUNDOS + 60);

    const resultado = useCase.execute();

    expect(resultado.rpoSuperado).toBe(true);
  });

  it('nunca devuelve una antigüedad negativa si el reloj se corrige', () => {
    metricSet.ultimoBackupExitoso = Math.floor(ahora / 1000) + 120;

    expect(useCase.execute().antiguedadSegundos).toBe(0);
  });
});
