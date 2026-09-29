import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Module,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { NextFunction, Request, Response } from 'express';
import { CorrelationIdMiddleware } from '../src/modules/tracing/infrastructure/middleware/correlation-id.middleware';
import { TracingInterceptor } from '../src/modules/tracing/infrastructure/interceptors/tracing.interceptor';
import { ActivityLogInterceptor } from '../src/modules/logs/infrastructure/interceptors/activity-log.interceptor';
import { TracingContextService } from '../src/modules/tracing/domain/services/tracing-context.service';
import { PathNormalizerService } from '../src/modules/tracing/domain/services/path-normalizer.service';
import { RedactionService } from '../src/modules/tracing/domain/services/redaction.service';
import { TracingConfigService } from '../src/modules/tracing/domain/services/tracing-config.service';
import {
  TrazaRepository,
  type ListadoTrazas,
  type TrazaConSpans,
} from '../src/modules/tracing/domain/repositories/traza.repository';
import type { Traza } from '../src/modules/tracing/domain/entities/traza.entity';
import type { LogEntity } from '../src/modules/logs/domain/entities/log.entity';
import { PrismaService } from '../src/connect/prisma.service';

/**
 * Propagación del identificador de correlación de punta a punta (Principio II,
 * `T040`).
 *
 * Lo que exige la issue es que una petición se pueda correlacionar con sus logs.
 * Eso no se cumple por tener las tres piezas por separado —middleware que
 * genera el id, interceptor que guarda la traza, interceptor de actividad que
 * guarda el log—, sino por que las tres reciba el mismo valor en la misma
 * petición. Eso es justo lo que se comprueba aquí, con las tres piezas reales
 * montadas en una aplicación Nest y solo las bases de datos sustituidas por
 * dobles que guardan lo que se les pasa.
 */
const trazasGuardadas: Traza[] = [];
const logsGuardados: LogEntity[] = [];

/** Doble de PostgreSQL: conserva lo escrito para poder compararlo entre sí. */
@Injectable()
class TrazaRepositoryDoble extends TrazaRepository {
  guardar(traza: Traza): Promise<void> {
    trazasGuardadas.push(traza);
    return Promise.resolve();
  }

  listar(): Promise<ListadoTrazas> {
    return Promise.resolve({
      trazas: trazasGuardadas,
      total: trazasGuardadas.length,
    });
  }

  obtenerPorCorrelationId(): Promise<TrazaConSpans | null> {
    return Promise.resolve(null);
  }

  purgarVencidas(): Promise<{ count: number }> {
    return Promise.resolve({ count: 0 });
  }
}

@Injectable()
class PrismaDoble {
  logs_Actividad = {
    create: ({ data }: { data: LogEntity }): Promise<LogEntity> => {
      logsGuardados.push(data);
      return Promise.resolve(data);
    },
  };
}

/**
 * Rutas de escritura, que son las que registran el log de actividad: solo las
 * mutantes se registran, así que una lectura no serviría para comprobar la
 * correlación.
 */
@UseInterceptors(TracingInterceptor, ActivityLogInterceptor)
@Controller('eventos')
class ControladorEventos {
  @Post(':id')
  crear() {
    return { ok: true };
  }

  @Post('fallar/:id')
  fallar() {
    throw new Error('fallo de negocio simulado');
  }
}

@UseInterceptors(TracingInterceptor, ActivityLogInterceptor)
@Controller('consultas')
class ControladorConsultas {
  @Get(':id')
  leer() {
    return { ok: true };
  }
}

/** Ruta excluida: se instrumenta igual, y la lista de prefijos la deja pasar. */
@UseInterceptors(TracingInterceptor, ActivityLogInterceptor)
@Controller('health')
class ControladorSalud {
  @Get()
  estado() {
    return { ok: true };
  }
}

@Module({
  controllers: [ControladorEventos, ControladorConsultas, ControladorSalud],
  providers: [
    TracingContextService,
    PathNormalizerService,
    RedactionService,
    TracingConfigService,
    TracingInterceptor,
    ActivityLogInterceptor,
    { provide: TrazaRepository, useClass: TrazaRepositoryDoble },
    // El doble sustituye a `PrismaService` por su token real: así el
    // interceptor se construye tal cual lo hace en producción, sin una
    // conexión a PostgreSQL que en una prueba de integración no existe.
    { provide: PrismaService, useClass: PrismaDoble },
  ],
})
class ModuloDePrueba {}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Propagación del identificador de correlación (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ModuloDePrueba],
    }).compile();

    app = moduleRef.createNestApplication();
    // El middleware real se monta a mano en lugar de con `configure()` porque el
    // módulo de prueba no hereda la configuración de `TrazasModule`: lo que se
    // prueba es su comportamiento, no dónde se declara. Va envuelto en una
    // flecha y no pasado por referencia porque `use` perdería `this`.
    const correlationId = new CorrelationIdMiddleware(
      app.get(TracingContextService),
    );
    app.use((req: Request, res: Response, next: NextFunction) =>
      correlationId.use(req, res, next),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    trazasGuardadas.length = 0;
    logsGuardados.length = 0;
  });

  it('devuelve un identificador válido cuando el cliente no envía ninguno', async () => {
    const respuesta = await request(app.getHttpServer() as App)
      .post('/eventos/7')
      .expect(201);

    expect(respuesta.headers['x-request-id']).toMatch(UUID_V4);
  });

  it('conserva el identificador válido que envía el cliente', async () => {
    const correlationId = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';

    const respuesta = await request(app.getHttpServer() as App)
      .post('/eventos/7')
      .set('X-Request-Id', correlationId)
      .expect(201);

    expect(respuesta.headers['x-request-id']).toBe(correlationId);
    expect(trazasGuardadas).toHaveLength(1);
    expect(trazasGuardadas[0].correlation_id).toBe(correlationId);
  });

  it('escribe el mismo identificador en la traza y en el log de la petición', async () => {
    const correlationId = '9c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

    const respuesta = await request(app.getHttpServer() as App)
      .post('/eventos/7')
      .set('X-Request-Id', correlationId)
      .expect(201);

    const deLaTraza = trazasGuardadas[0].correlation_id;
    const delLog = (logsGuardados[0].datos_extra as { correlationId?: string })
      .correlationId;

    expect(deLaTraza).toBe(correlationId);
    expect(delLog).toBe(correlationId);
    expect(delLog).toBe(deLaTraza);
    expect(respuesta.headers['x-request-id']).toBe(deLaTraza);
  });

  it('correlaciona también el log de una petición fallida con su traza', async () => {
    const correlationId = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

    await request(app.getHttpServer() as App)
      .post('/eventos/fallar/7')
      .set('X-Request-Id', correlationId)
      .expect(500);

    expect(trazasGuardadas).toHaveLength(1);
    expect(trazasGuardadas[0].correlation_id).toBe(correlationId);
    expect(trazasGuardadas[0].estado_http).toBe(500);
    expect(logsGuardados).toHaveLength(1);
    expect(logsGuardados[0].tipo).toBe('error');
    expect(
      (logsGuardados[0].datos_extra as { correlationId?: string })
        .correlationId,
    ).toBe(correlationId);
  });

  it('adopta el identificador de un traceparent para no romper la cadena', async () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';

    const respuesta = await request(app.getHttpServer() as App)
      .post('/eventos/7')
      .set('traceparent', `00-${traceId}-00f067aa0ba902b7-01`)
      .expect(201);

    expect(respuesta.headers['x-request-id']).toBe(traceId);
    expect(trazasGuardadas[0].correlation_id).toBe(traceId);
  });

  it('descarta un identificador manipulado en lugar de propagarlo', async () => {
    const respuesta = await request(app.getHttpServer() as App)
      .post('/eventos/7')
      .set('X-Request-Id', 'inyectado por el cliente')
      .expect(201);

    const emitido = respuesta.headers['x-request-id'];

    expect(emitido).toMatch(UUID_V4);
    // Lo que el cliente envió no debe aparecer en ninguna de las tres piezas: si
    // se propagara, buscar una traza por un valor que el usuario controla
    // devolvería resultados de otra petición.
    expect(emitido).not.toContain('inyectado');
    expect(trazasGuardadas[0].correlation_id).toBe(emitido);
  });

  it('registra también las lecturas, con la ruta normalizada', async () => {
    await request(app.getHttpServer() as App)
      .get('/consultas/7')
      .expect(200);

    expect(trazasGuardadas).toHaveLength(1);
    expect(trazasGuardadas[0].ruta).toBe('/consultas/:id');
    expect(trazasGuardadas[0].metodo).toBe('GET');
  });

  it('no instrumenta las rutas que usa el propio observabilidad', async () => {
    // `/health` está en la lista de exclusión: la respuesta sigue siendo
    // 200 —excluir la instrumentación no puede cambiar el contrato—, pero no
    // deja traza. Es la razón de existir de la lista: una comprobación de
    // vida cada pocos segundos llenaría la tabla de trazas.
    await request(app.getHttpServer() as App)
      .get('/health')
      .expect(200);

    expect(trazasGuardadas).toHaveLength(0);
  });
});
