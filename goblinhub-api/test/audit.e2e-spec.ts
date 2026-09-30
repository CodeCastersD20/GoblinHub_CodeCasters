import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AUDITORIA_REPOSITORY } from '../src/modules/auditoria/domain/repositories/log-auditoria.repository';
import type {
  FiltrosAuditoria,
  ListadoAuditoria,
  PaginacionAuditoria,
  RegistroAuditoria,
} from '../src/modules/auditoria/domain/repositories/log-auditoria.repository';
import { AuditoriaService } from '../src/modules/auditoria/domain/services/auditoria.service';
import { AuditoriaMiddleware } from '../src/modules/auditoria/infrastructure/middleware/auditoria.middleware';
import { AuditLogController } from '../src/modules/auditoria/interfaces/controllers/audit-log.controller';
import { GetAuditLogsUseCase } from '../src/modules/auditoria/application/use-case/get-audit-logs.use-case';
import { LogAuditoria } from '../src/modules/auditoria/domain/entities/log-auditoria.entity';
import { PathNormalizerService } from '../src/modules/tracing/domain/services/path-normalizer.service';
import { RolUsuario } from '../src/modules/supabase/domain/enums/user.enum';

const ACTOR = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';
const CORRELACION = 'a1b2c3d4-1111-4222-8333-444455556666';

const registro = new LogAuditoria(
  '1',
  'usuario',
  ACTOR,
  'POST',
  '/events',
  'exitoso',
  CORRELACION,
  new Date('2026-01-01T10:00:00.000Z'),
  { nombre: 'Ana', apellidos: 'Torres', rol: 'admin' },
);

/**
 * Doble de los dos guards. Decide según una cabecera que envía la propia
 * prueba, igual que el de `traces.e2e-spec.ts`.
 *
 * Además identifica al usuario antes de denegar, que es lo que hace
 * `SupabaseAuthGuard` de verdad: un `403` llega con la sesión resuelta y un
 * `401` sin ella, y la auditoría tiene que distinguir entre los dos.
 */
@Injectable()
class GuardDePrueba implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { id?: string };
    }>();

    const rol = peticion.headers['x-rol-de-prueba'] as RolUsuario | undefined;

    if (rol === undefined) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    peticion.user = { id: ACTOR };

    if (rol !== RolUsuario.admin) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}

/** Controlador que existe solo para que el middleware tenga qué auditar. */
@Controller('demo')
@UseGuards(GuardDePrueba)
class DemoController {
  @Get()
  listar(): { ok: boolean } {
    return { ok: true };
  }

  @Post()
  crear(): { ok: boolean } {
    return { ok: true };
  }

  @Post('falla')
  fallar(): never {
    throw new Error('boom');
  }
}

/** Doble del repositorio: ni la API ni la auditoría tocan la base en una prueba. */
class RepositorioDePrueba {
  registrar = jest
    .fn<Promise<void>, [RegistroAuditoria]>()
    .mockResolvedValue(undefined);
  listar = jest
    .fn<Promise<ListadoAuditoria>, [FiltrosAuditoria, PaginacionAuditoria]>()
    .mockResolvedValue({ registros: [registro], total: 1 });
}

@Module({
  controllers: [AuditLogController, DemoController],
  providers: [
    { provide: AUDITORIA_REPOSITORY, useClass: RepositorioDePrueba },
    GetAuditLogsUseCase,
    AuditoriaService,
    PathNormalizerService,
  ],
})
class ModuloAuditoriaPrueba implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuditoriaMiddleware).forRoutes('*');
  }
}

/**
 * Contrato HTTP del visor de auditoría y del registro de peticiones (#212).
 *
 * Se comprueban los tres desenlaces que el criterio 5 pide probar —permitido,
 * rechazado y fallido— sobre la única vía de escritura, y la protección y los
 * cinco filtros del endpoint de consulta.
 */
describe('Auditoría (e2e)', () => {
  let app: INestApplication<App>;
  let repositorio: RepositorioDePrueba;

  /**
   * Los guards reales se cambian por reflexión sobre la metadata `__guards__`
   * que deja `@UseGuards`, y no registrando un provider con el mismo token:
   * Nest instancia la clase que aparece en el decorador, así que un
   * `overrideProvider` no evita que se construya el guard real —con Supabase,
   * Prisma y Redis— antes de sustituirlo. Cambiar la metadata es lo único que
   * impide siquiera llegar a construirlo.
   *
   * Se restaura después de cada prueba para que el cambio no se filtre a
   * cualquier otro archivo del mismo proceso de Jest.
   */
  const GUARDS = '__guards__';
  let guardsOriginales: unknown;

  beforeEach(async () => {
    guardsOriginales = Reflect.getMetadata(GUARDS, AuditLogController);
    Reflect.defineMetadata(GUARDS, [GuardDePrueba], AuditLogController);

    repositorio = new RepositorioDePrueba();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ModuloAuditoriaPrueba],
    })
      .overrideProvider(AUDITORIA_REPOSITORY)
      .useValue(repositorio)
      .compile();

    app = moduleFixture.createNestApplication();
    // Mismas opciones que el `ValidationPipe` global de `main.ts`: sin ellas,
    // un parámetro desconocido pasaría inadvertido y la prueba de 400 mentiría.
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
    Reflect.defineMetadata(GUARDS, guardsOriginales, AuditLogController);
  });

  /**
   * El registro se escribe al terminar la respuesta, así que hay que dejar que
   * la cola de tareas gire antes de mirar el repositorio.
   */
  const trasLaRespuesta = async () => {
    await new Promise((resolve) => setImmediate(resolve));
  };

  const comoAdmin = (ruta: string) =>
    request(app.getHttpServer()).get(ruta).set('x-rol-de-prueba', 'admin');

  const ultimoRegistro = () => repositorio.registrar.mock.calls.at(-1)?.[0];

  /** La forma de la respuesta de `GET /audit-logs`, distinta de la del repositorio. */
  type ListadoRespuesta = {
    data: { correlation_id: string; actor: { nombre: string } | null }[];
    total: number | null;
    page: number;
    limit: number;
  };

  const listadoDe = (cuerpo: unknown): ListadoRespuesta =>
    cuerpo as ListadoRespuesta;

  describe('registro de las peticiones', () => {
    it('deja constancia de una operación permitida con sus seis campos', async () => {
      await request(app.getHttpServer())
        .post('/demo')
        .set('x-rol-de-prueba', RolUsuario.admin)
        .set('x-request-id', CORRELACION)
        .expect(201);

      await trasLaRespuesta();

      expect(repositorio.registrar).toHaveBeenCalledTimes(1);
      expect(ultimoRegistro()).toEqual({
        actor_tipo: 'usuario',
        actor_id: ACTOR,
        accion: 'POST',
        recurso: '/demo',
        resultado: 'exitoso',
        correlation_id: CORRELACION,
      });
    });

    it('deja constancia de un intento rechazado sin token', async () => {
      await request(app.getHttpServer()).post('/demo').expect(401);

      await trasLaRespuesta();

      expect(ultimoRegistro()).toMatchObject({
        actor_tipo: 'anonimo',
        actor_id: null,
        resultado: 'rechazado',
      });
    });

    it('deja constancia de un intento rechazado por rol, con el actor identificado', async () => {
      await request(app.getHttpServer())
        .post('/demo')
        .set('x-rol-de-prueba', RolUsuario.jugador)
        .expect(403);

      await trasLaRespuesta();

      expect(ultimoRegistro()).toMatchObject({
        actor_tipo: 'usuario',
        actor_id: ACTOR,
        resultado: 'rechazado',
      });
    });

    it('deja constancia de una operación fallida', async () => {
      await request(app.getHttpServer())
        .post('/demo/falla')
        .set('x-rol-de-prueba', RolUsuario.admin)
        .expect(500);

      await trasLaRespuesta();

      expect(ultimoRegistro()).toMatchObject({
        accion: 'POST',
        recurso: '/demo/falla',
        resultado: 'fallido',
      });
    });

    it('no audita las peticiones de solo lectura', async () => {
      await request(app.getHttpServer())
        .get('/demo')
        .set('x-rol-de-prueba', RolUsuario.admin)
        .expect(200);

      await trasLaRespuesta();

      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    it('no audita la consulta de su propio visor', async () => {
      await comoAdmin('/audit-logs').expect(200);

      await trasLaRespuesta();

      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    it('una caída del repositorio no rompe la petición', async () => {
      repositorio.registrar.mockRejectedValue(new Error('sin base de datos'));

      await request(app.getHttpServer())
        .post('/demo')
        .set('x-rol-de-prueba', RolUsuario.admin)
        .expect(201);
    });
  });

  describe('protección del visor', () => {
    it('GET /audit-logs responde 401 sin token', async () => {
      const respuesta = await request(app.getHttpServer()).get('/audit-logs');

      expect(respuesta.status).toBe(401);
    });

    it('GET /audit-logs responde 403 con rol jugador', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('x-rol-de-prueba', RolUsuario.jugador);

      expect(respuesta.status).toBe(403);
    });

    it('no consulta la base de datos cuando la petición no está autorizada', async () => {
      await request(app.getHttpServer()).get('/audit-logs');
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('x-rol-de-prueba', RolUsuario.jugador);

      expect(repositorio.listar).not.toHaveBeenCalled();
    });
  });

  describe('GET /audit-logs', () => {
    it('responde 200 con la página de registros', async () => {
      const respuesta = await comoAdmin('/audit-logs');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        data: [
          expect.objectContaining({
            correlation_id: CORRELACION,
            resultado: 'exitoso',
            actor: { nombre: 'Ana', apellidos: 'Torres', rol: 'admin' },
          }),
        ],
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it('responde 400 con un parámetro desconocido', async () => {
      const respuesta = await comoAdmin('/audit-logs?inventado=1');

      expect(respuesta.status).toBe(400);
      expect(repositorio.listar).not.toHaveBeenCalled();
    });

    it('responde 400 con un resultado fuera del catálogo', async () => {
      const respuesta = await comoAdmin('/audit-logs?resultado=pendiente');

      expect(respuesta.status).toBe(400);
      expect(repositorio.listar).not.toHaveBeenCalled();
    });

    it('acota un limit por encima del máximo en lugar de rechazar', async () => {
      const respuesta = await comoAdmin('/audit-logs?limit=9999');

      expect(respuesta.status).toBe(200);
      expect(listadoDe(respuesta.body).limit).toBe(200);
    });

    it('devuelve 200 y lista vacía con el rango de fechas invertido', async () => {
      const respuesta = await comoAdmin(
        '/audit-logs?desde=2026-02-01T00:00:00.000Z&hasta=2026-01-01T00:00:00.000Z&includeTotal=true',
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

    // Los cinco filtros que nombra el criterio 3 de #212.
    it('traslada el filtro por actor', async () => {
      await comoAdmin('/audit-logs?actor=ana');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { actor: 'ana' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por acción, normalizado a mayúsculas', async () => {
      await comoAdmin('/audit-logs?accion=post');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { accion: 'POST' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por recurso', async () => {
      await comoAdmin('/audit-logs?recurso=/events');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { recurso: '/events' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por resultado', async () => {
      await comoAdmin('/audit-logs?resultado=rechazado');

      expect(repositorio.listar).toHaveBeenCalledWith(
        { resultado: 'rechazado' },
        { page: 1, limit: 50, includeTotal: false },
      );
    });

    it('traslada el filtro por rango de fechas', async () => {
      await comoAdmin(
        '/audit-logs?desde=2026-01-01T00:00:00.000Z&hasta=2026-01-31T00:00:00.000Z',
      );

      expect(repositorio.listar).toHaveBeenCalledWith(
        {
          desde: new Date('2026-01-01T00:00:00.000Z'),
          hasta: new Date('2026-01-31T00:00:00.000Z'),
        },
        { page: 1, limit: 50, includeTotal: false },
      );
    });
  });
});
