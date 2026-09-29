import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TRAZA_REPOSITORY } from '../src/modules/tracing/domain/repositories/traza.repository';
import { TrazaController } from '../src/modules/tracing/interfaces/controllers/trace.controller';
import { GetTracesUseCase } from '../src/modules/tracing/application/use-case/get-traces.use-case';
import { GetTraceUseCase } from '../src/modules/tracing/application/use-case/get-trace.use-case';
import { RolUsuario } from '../src/modules/supabase/domain/enums/user.enum';
import { Traza } from '../src/modules/tracing/domain/entities/traza.entity';
import { Span } from '../src/modules/tracing/domain/entities/span.entity';
import {
  EstadoSpan,
  TipoSpan,
} from '../src/modules/tracing/domain/enums/tipo-span.enum';

const traza: Traza = new Traza(
  'traza-1',
  'corr-1',
  'GET',
  '/events/:id',
  200,
  120,
  'development',
  new Date('2026-01-01T10:00:00.000Z'),
  new Date('2026-01-01T10:00:00.120Z'),
  '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73',
  null,
);

const raiz = new Span(
  'span-1',
  'traza-1',
  'petición',
  TipoSpan.http,
  120,
  EstadoSpan.ok,
  new Date('2026-01-01T10:00:00.000Z'),
  null,
  { ruta: '/events/:id' },
);

const hijo = new Span(
  'span-2',
  'traza-1',
  'consultar evento',
  TipoSpan.prisma,
  80,
  EstadoSpan.ok,
  new Date('2026-01-01T10:00:00.010Z'),
  'span-1',
  null,
);

/**
 * Verificación de contrato HTTP de los dos endpoints de trazabilidad
 * (Principio V, `T037` y `T038`).
 *
 * Se monta el controlador real con las dependencias externas sustituidas por
 * dobles: PostgreSQL, Redis y Supabase no existen en una prueba de integración.
 * Lo que se comprueba aquí es el contrato observable —códigos de estado,
 * validación y forma de la respuesta—, que es justo lo que `FR-012` a `FR-015`
 * fijan.
 */
/**
 * Doble de los dos guards. Decide según una cabecera que envía la propia prueba.
 *
 * `SupabaseAuthGuard` y `RolesGuard` ya tienen pruebas propias; lo que importa
 * aquí es que el controlador los declara y que su veredicto llega al cliente
 * como 401 o 403 en lugar de filtrar datos.
 *
 * Sin constructor a propósito: el guard real necesita Supabase, Prisma y Redis,
 * y una integración no debe requerir ninguno de los tres.
 */
@Injectable()
class GuardDePrueba implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const rol = peticion.headers['x-rol-de-prueba'] as RolUsuario | undefined;

    if (rol === undefined) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    if (rol !== RolUsuario.admin) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}

describe('Trazabilidad (e2e)', () => {
  let app: INestApplication<App>;
  let repositorio: {
    listar: jest.Mock;
    obtenerPorCorrelationId: jest.Mock;
  };

  /**
   * Los guards se cambian por reflexión sobre la metadata `__guards__` que deja
   * `@UseGuards`, y no registrando un provider con el mismo token: Nest
   * instancia la clase que aparece en el decorador, así que un
   * `overrideProvider(SupabaseAuthGuard)` no evita que se construya el guard real
   * —con sus dependencias de Supabase, Prisma y Redis— antes de sustituirlo.
   * Cambiar la metadata es lo único que impide siquiera llegar a construirlo.
   *
   * Se restaura después de cada prueba para que el cambio no se filtre a
   * cualquier otro archivo del mismo proceso de Jest.
   */
  const GUARDS = '__guards__';
  let guardsOriginales: unknown;

  beforeEach(async () => {
    guardsOriginales = Reflect.getMetadata(GUARDS, TrazaController);
    Reflect.defineMetadata(GUARDS, [GuardDePrueba], TrazaController);

    repositorio = {
      listar: jest.fn(() => Promise.resolve({ trazas: [traza], total: 1 })),
      obtenerPorCorrelationId: jest.fn((correlationId: string) =>
        Promise.resolve(
          correlationId === 'corr-1' ? { traza, spans: [raiz, hijo] } : null,
        ),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TrazaController],
      providers: [
        { provide: TRAZA_REPOSITORY, useValue: repositorio },
        // Los casos de uso reales, no dobles: con el repositorio ya sustituido
        // no tocan la base de datos, y usarlos de verdad es lo que comprueba que
        // el controlador los inyecta por el token correcto.
        GetTracesUseCase,
        GetTraceUseCase,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mismas opciones que el `ValidationPipe` global de `main.ts`: sin ellas, un
    // parámetro desconocido pasaría inadvertido y la prueba de 400 mentiría.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    Reflect.defineMetadata(GUARDS, guardsOriginales, TrazaController);
  });

  const comoAdmin = (ruta: string) =>
    request(app.getHttpServer()).get(ruta).set('x-rol-de-prueba', 'admin');

  /**
   * `supertest` tipa el cuerpo de la respuesta como `any`. Narrowing aquí, en
   * lugar de repetir el tipo en cada aserción, es lo que deja las pruebas
   * legible sin desactivar las reglas de seguridad de tipos del linter.
   */
  type ListadoTrazas = {
    data: { correlation_id: string }[];
    total: number | null;
    page: number;
    limit: number;
  };

  type NodoSpan = { id_span: string; hijos: NodoSpan[] };

  type DetalleTraza = {
    traza: { correlation_id: string };
    pasos: NodoSpan[];
  };

  const listadoDe = (cuerpo: unknown): ListadoTrazas => cuerpo as ListadoTrazas;
  const detalleDe = (cuerpo: unknown): DetalleTraza => cuerpo as DetalleTraza;

  describe('protección', () => {
    it('GET /traces responde 401 sin token', async () => {
      const respuesta = await request(app.getHttpServer()).get('/traces');

      expect(respuesta.status).toBe(401);
    });

    it('GET /traces/:correlationId responde 401 sin token', async () => {
      const respuesta = await request(app.getHttpServer()).get(
        '/traces/corr-1',
      );

      expect(respuesta.status).toBe(401);
    });

    it('GET /traces responde 403 con rol jugador', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/traces')
        .set('x-rol-de-prueba', RolUsuario.jugador);

      expect(respuesta.status).toBe(403);
    });

    it('GET /traces/:correlationId responde 403 con rol jugador', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/traces/corr-1')
        .set('x-rol-de-prueba', RolUsuario.jugador);

      expect(respuesta.status).toBe(403);
    });

    it('no consulta la base de datos cuando la petición no está autorizada', async () => {
      await request(app.getHttpServer()).get('/traces');
      await request(app.getHttpServer())
        .get('/traces/corr-1')
        .set('x-rol-de-prueba', RolUsuario.jugador);

      expect(repositorio.listar).not.toHaveBeenCalled();
      expect(repositorio.obtenerPorCorrelationId).not.toHaveBeenCalled();
    });
  });

  describe('GET /traces', () => {
    it('responde 200 con la página de trazas', async () => {
      const respuesta = await comoAdmin('/traces');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        data: [expect.objectContaining({ correlation_id: 'corr-1' })],
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it('responde 400 con un parámetro desconocido', async () => {
      const respuesta = await comoAdmin('/traces?inventado=1');

      expect(respuesta.status).toBe(400);
      expect(repositorio.listar).not.toHaveBeenCalled();
    });

    it('acota un limit por encima del máximo en lugar de rechazar', async () => {
      const respuesta = await comoAdmin('/traces?limit=9999');

      expect(respuesta.status).toBe(200);
      expect(listadoDe(respuesta.body).limit).toBe(200);
    });

    it('devuelve 200 y lista vacía con el rango de fechas invertido', async () => {
      const respuesta = await comoAdmin(
        '/traces?desde=2026-02-01T00:00:00.000Z&hasta=2026-01-01T00:00:00.000Z&includeTotal=true',
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });
      expect(repositorio.listar).not.toHaveBeenCalled();
    });

    it('normaliza el verbo a mayúsculas antes de filtrar', async () => {
      await comoAdmin('/traces?metodo=get');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { metodo: 'GET' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('omite el total cuando no se pide', async () => {
      const respuesta = await comoAdmin('/traces');

      expect(listadoDe(respuesta.body).total).toBe(1);
      expect(repositorio.listar).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    // Los cuatro filtros que nombra el alcance de #204, más el despliegue del
    // criterio de aceptación. Se escriben uno a uno en lugar de generar el
    // caso desde la consulta porque cada uno llega al repositorio con un tipo
    // distinto: `metodo` normalizado, `estado` como número y `desde` como fecha.
    it('traslada el filtro por servicio', async () => {
      await comoAdmin('/traces?servicio=goblinhub-api');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { servicio: 'goblinhub-api' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por operación, método y ruta', async () => {
      await comoAdmin('/traces?metodo=GET&ruta=/events');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { metodo: 'GET', ruta: '/events' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por estado', async () => {
      await comoAdmin('/traces?estado=500');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { estado: 500 },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por periodo como fechas', async () => {
      await comoAdmin(
        '/traces?desde=2026-01-01T00:00:00.000Z&hasta=2026-01-31T00:00:00.000Z',
      );

      expect(repositorio.listar).toHaveBeenCalledWith(
        {
          desde: new Date('2026-01-01T00:00:00.000Z'),
          hasta: new Date('2026-01-31T00:00:00.000Z'),
        },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por despliegue', async () => {
      await comoAdmin('/traces?ambiente=production');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { ambiente: 'production' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });
  });

  describe('GET /traces/:correlationId', () => {
    it('responde 200 con la traza y sus pasos anidados', async () => {
      const respuesta = await comoAdmin('/traces/corr-1');
      const detalle = detalleDe(respuesta.body);

      expect(respuesta.status).toBe(200);
      expect(detalle.traza.correlation_id).toBe('corr-1');
      expect(detalle.pasos).toHaveLength(1);
      expect(detalle.pasos[0].id_span).toBe('span-1');
      expect(detalle.pasos[0].hijos[0].id_span).toBe('span-2');
    });

    it('responde 404 si la correlación no existe', async () => {
      const respuesta = await comoAdmin('/traces/corr-que-no-existe');

      expect(respuesta.status).toBe(404);
    });
  });
});
