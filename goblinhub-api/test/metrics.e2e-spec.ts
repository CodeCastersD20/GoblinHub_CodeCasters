import { Test, TestingModule } from '@nestjs/testing';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  Controller,
  Get,
  INestApplication,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MetricsModule } from '../src/modules/metrics/metrics.module';
import { PrismaService } from '../src/connect/prisma.service';
import { HealthService } from '../src/modules/health/health.service';
import { MetricsInterceptor } from '../src/modules/metrics/infrastructure/interceptors/metrics.interceptor';

/**
 * Ruta de negocio mínima para comprobar, sobre HTTP real, que la métrica se
 * etiqueta con el patrón de ruta (`/productos/:id`) y no con el identificador
 * literal, que es lo que acota la cardinalidad.
 */
@Controller('productos')
class ProductoStubController {
  @Get(':id')
  detalle(@Param('id') id: string) {
    return { id };
  }
}

/**
 * Verificación de contrato HTTP de `GET /metrics` (Principio V).
 *
 * Se monta el módulo real de métricas y se sustituyen las dos dependencias
 * externas (PostgreSQL y Redis) por dobles: lo que se comprueba aquí es la
 * exposición HTTP, no la conectividad, que ya cubren `health.service.spec.ts`.
 */
describe('Métricas (e2e)', () => {
  let app: INestApplication<App>;

  /** Valor actual del contador de peticiones de la ruta de negocio. */
  async function contadorDePeticiones(): Promise<number> {
    const respuesta = await request(app.getHttpServer()).get('/metrics');
    const linea = respuesta.text
      .split('\n')
      .find((item) => item.startsWith('goblinhub_http_requests_total{'));
    if (!linea) {
      return 0;
    }
    return Number(linea.slice(linea.lastIndexOf(' ') + 1));
  }

  beforeAll(async () => {
    process.env.DEPLOY_ENV = 'staging';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MetricsModule],
      controllers: [ProductoStubController],
      // En `AppModule` el interceptor se registra como `APP_INTERCEPTOR`; sin
      // ese registro global no se aplicaría a las rutas de negocio.
      providers: [{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }],
    })
      .overrideProvider(PrismaService)
      .useValue({ poolStats: { enUso: 1, maximo: 10 }, $queryRaw: jest.fn() })
      .overrideProvider(HealthService)
      .useValue({
        readiness: jest.fn().mockResolvedValue({ estado: 'ok' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.DEPLOY_ENV;
  });

  it('GET /metrics responde 200 con el content type de exposición de Prometheus', async () => {
    const respuesta = await request(app.getHttpServer()).get('/metrics');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toContain('text/plain');
    expect(respuesta.headers['content-type']).toContain('version=0.0.4');
  });

  it('GET /metrics expone las cuatro familias técnicas que pide el AC de #214', async () => {
    // Una petición real es lo que da lugar a las series del histograma.
    await request(app.getHttpServer()).get('/productos/7');

    const respuesta = await request(app.getHttpServer()).get('/metrics');
    const cuerpo = respuesta.text;

    // Disponibilidad y throughput
    expect(cuerpo).toContain('goblinhub_http_requests_total');
    // Latencia, con histograma del que se derivan P50/P95/P99
    expect(cuerpo).toContain('goblinhub_http_request_duration_seconds_bucket');
    expect(cuerpo).toContain('goblinhub_http_request_duration_seconds_count');
    // Tasa de error: el estado viaja como etiqueta del contador
    expect(cuerpo).toContain('status="200"');
    // Recursos
    expect(cuerpo).toContain('process_resident_memory_bytes');
    expect(cuerpo).toContain('nodejs_eventloop_lag_seconds');
    // Salud de dependencias y respaldo (M-12, M-13)
    expect(cuerpo).toContain('goblinhub_health_ready');
    expect(cuerpo).toContain('goblinhub_backup_last_success_timestamp_seconds');
  });

  it('GET /metrics incluye la etiqueta de entorno en todas las métricas de la app', async () => {
    const respuesta = await request(app.getHttpServer()).get('/metrics');

    expect(respuesta.text).toContain('deployment_environment="staging"');
  });

  it('etiqueta la ruta con el patrón y no con el identificador literal', async () => {
    const antes = await contadorDePeticiones();
    await request(app.getHttpServer()).get('/productos/999');
    await request(app.getHttpServer()).get('/productos/1000');
    const despues = await contadorDePeticiones();

    const respuesta = await request(app.getHttpServer()).get('/metrics');

    // Una sola serie para las dos peticiones: la cardinalidad no crece con los
    // identificadores.
    expect(despues).toBe(antes + 2);
    expect(respuesta.text).toContain('route="/productos/:id"');
    expect(respuesta.text).not.toContain('route="/productos/999"');
    expect(respuesta.text).not.toContain('route="/productos/1000"');
  });

  it('no cuenta las peticiones al propio /metrics', async () => {
    const antes = await request(app.getHttpServer()).get('/metrics');
    const lineasAntes = antes.text
      .split('\n')
      .filter((linea) =>
        linea.startsWith('goblinhub_http_requests_total{'),
      ).length;

    for (let intento = 0; intento < 3; intento += 1) {
      await request(app.getHttpServer()).get('/metrics');
    }

    const despues = await request(app.getHttpServer()).get('/metrics');
    const lineasDespues = despues.text
      .split('\n')
      .filter((linea) =>
        linea.startsWith('goblinhub_http_requests_total{'),
      ).length;

    expect(lineasDespues).toBe(lineasAntes);
  });

  it('GET /metrics no se throttlea: 15 scrapes seguidos no reciben un 429', async () => {
    // El límite global es de 10 req/min por IP, así que 15 peticiones seguidas
    // dentro de la misma romperían un 429 si `@SkipThrottle()`
    // desapareciera del controlador.
    for (let intento = 0; intento < 15; intento += 1) {
      const respuesta = await request(app.getHttpServer()).get('/metrics');
      expect(respuesta.status).toBe(200);
    }
  });

  it('GET /metrics/backup-freshness informa la antigüedad del último respaldo', async () => {
    const respuesta = await request(app.getHttpServer()).get(
      '/metrics/backup-freshness',
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      ultimoExitosoEpoch: null,
      antiguedadSegundos: null,
      rpoSuperado: true,
    });
  });
});
