import { MetricsService } from './metrics.service';
import { NOMBRES_METRICAS } from '../../domain/entities/metric-set.entity';

describe('MetricsService', () => {
  const original = process.env.DEPLOY_ENV;
  let service: MetricsService;

  beforeEach(() => {
    process.env.DEPLOY_ENV = 'staging';
    service = new MetricsService();
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEPLOY_ENV;
    } else {
      process.env.DEPLOY_ENV = original;
    }
  });

  it('expone las cuatro familias técnicas con la etiqueta de entorno', async () => {
    service.onModuleInit();
    service.registrarPeticion('GET', '/productos', 200, 0.05);

    const texto = await service.exposition();

    // Disponibilidad y throughput: contador de peticiones (M-01, M-07)
    expect(texto).toContain(NOMBRES_METRICAS.peticionesTotales);
    // Latencia: histograma con buckets (M-03, M-04, M-05)
    expect(texto).toContain(`${NOMBRES_METRICAS.duracionPeticion}_bucket`);
    expect(texto).toContain(`${NOMBRES_METRICAS.duracionPeticion}_count`);
    // Recursos: collectDefaultMetrics() (M-08, M-09, M-10)
    expect(texto).toContain('process_resident_memory_bytes');
    expect(texto).toContain('process_cpu_seconds_total');
    expect(texto).toContain('nodejs_eventloop_lag_seconds');
    // Etiqueta constante de entorno (FR-006)
    expect(texto).toContain('deployment_environment="staging"');
  });

  it('declara el content type de exposición de Prometheus', () => {
    expect(service.contentType()).toContain('text/plain');
    expect(service.contentType()).toContain('version=0.0.4');
  });

  it('etiqueta método, ruta y estado en el contador', async () => {
    service.registrarPeticion('POST', '/auth/signin', 401, 0.12);

    const texto = await service.exposition();

    expect(texto).toContain(
      `goblinhub_http_requests_total{method="POST",route="/auth/signin",status="401"`,
    );
  });

  it('registra el resultado de la sonda de readiness como 0/1', async () => {
    service.registrarResultadoReadiness('degraded');
    expect(await service.exposition()).toContain(
      `${NOMBRES_METRICAS.saludReadiness}{deployment_environment="staging"} 0`,
    );

    service.registrarResultadoReadiness('ok');
    expect(await service.exposition()).toContain(
      `${NOMBRES_METRICAS.saludReadiness}{deployment_environment="staging"} 1`,
    );
  });

  it('publica el pool de conexiones en uso y su máximo', async () => {
    service.registrarPoolConexiones(8, 10);

    const texto = await service.exposition();

    expect(texto).toContain(
      `${NOMBRES_METRICAS.poolConexionesEnUso}{deployment_environment="staging"} 8`,
    );
    expect(texto).toContain(
      `${NOMBRES_METRICAS.poolConexionesMaximo}{deployment_environment="staging"} 10`,
    );
  });

  it('publica la marca del último respaldo exitoso como epoch en segundos', async () => {
    service.registrarBackupExitoso(new Date('2026-09-26T10:00:00.000Z'));

    const texto = await service.exposition();

    expect(texto).toContain(
      `${NOMBRES_METRICAS.ultimoBackupExitoso}{deployment_environment="staging"} ${Math.floor(
        new Date('2026-09-26T10:00:00.000Z').getTime() / 1000,
      )}`,
    );
  });

  it('reporta que no hay respaldo cuando la marca nunca se publicó', () => {
    const metricSet = service.metricSet();

    expect(metricSet.hayUltimoBackup).toBe(false);
    expect(metricSet.ultimoBackupExitoso).toBeNull();
  });

  it('no duplica métricas si onModuleInit se llama dos veces', async () => {
    service.onModuleInit();
    service.onModuleInit();

    await expect(service.exposition()).resolves.toContain(
      'nodejs_eventloop_lag_seconds',
    );
  });
});
