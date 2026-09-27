import { type ExecutionContext } from '@nestjs/common';
import { of, Subject, throwError } from 'rxjs';
import type { Request } from 'express';
import { TracingInterceptor } from './tracing.interceptor';
import { TracingContextService } from '../../domain/services/tracing-context.service';
import { PathNormalizerService } from '../../domain/services/path-normalizer.service';
import type { Reloj } from '../../domain/services/reloj';
import { EstadoSpan, TipoSpan } from '../../domain/enums/tipo-span.enum';
import type { Traza } from '../../domain/entities/traza.entity';
import type { Span as SpanEntity } from '../../domain/entities/span.entity';

const UUID = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';
const OTRO_UUID = '660f8400-e29b-41d4-a716-446655440001';

describe('TracingInterceptor', () => {
  let guardar: jest.Mock<Promise<void>, [Traza, SpanEntity[]]>;
  let contexto: TracingContextService;
  let interceptor: TracingInterceptor;
  /** Reloj de pruebas: 50 ms por llamada de `ahora` y fechas crecientes. */
  let reloj: Reloj;

  const construirContexto = (peticion: Partial<Request> & { path: string }) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => peticion,
        getResponse: () => ({ statusCode: 200 }),
      }),
    }) as unknown as ExecutionContext;

  /**
   * Publica el contexto con el mismo reloj que el interceptor, para que la
   * traza y sus spans midan sobre la misma línea de tiempo. En producción ambos
   * usan el reloj del sistema y no hace falta pasarlo.
   */
  const enContexto = <T>(correlationId: string, operacion: () => T): T =>
    contexto.run(correlationId, operacion, reloj);

  const peticionValida = (ruta = '/events') =>
    ({
      method: 'GET',
      originalUrl: ruta,
      url: ruta,
      path: ruta,
      headers: {},
      user: { id: OTRO_UUID },
    }) as unknown as Request;

  /** El interceptor escribe sin `await`, así que hay que dejar correr la cola. */
  const esperarEscritura = () => new Promise((r) => setImmediate(r));

  const guardarSpy = () => {
    const llamadas = guardar.mock.calls;
    return { traza: llamadas[0][0], spans: llamadas[0][1] };
  };

  beforeEach(() => {
    let instante = 1_000;
    let marca = Date.UTC(2026, 8, 27, 12, 0, 0);
    reloj = {
      ahora: () => (instante += 50),
      fecha: () => new Date((marca += 1_000)),
    };
    guardar = jest
      .fn<Promise<void>, [Traza, SpanEntity[]]>()
      .mockResolvedValue();
    contexto = new TracingContextService();
    interceptor = new TracingInterceptor(
      { guardar },
      contexto,
      new PathNormalizerService(),
      reloj,
    );
  });

  describe('crea la traza al finalizar la petición', () => {
    it('persiste una traza con los datos de la petición', async () => {
      const manejador = { handle: () => of({ ok: true }) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
      });
      await esperarEscritura();

      expect(guardar).toHaveBeenCalledTimes(1);
      const { traza, spans } = guardarSpy();
      expect(traza.correlation_id).toBe(UUID);
      expect(traza.metodo).toBe('GET');
      expect(traza.ruta).toBe('/events');
      expect(traza.estado_http).toBe(200);
      expect(traza.ambiente).toBe(process.env.NODE_ENV ?? 'development');
      expect(traza.id_usuario).toBe(OTRO_UUID);
      expect(spans).toEqual([]);
    });

    it('calcula la duración con el reloj monotónico inyectado', async () => {
      const manejador = { handle: () => of({}) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
      });
      await esperarEscritura();

      // El reloj de la prueba avanza 50 ms por llamada: una antes de empezar y
      // otra al terminar, luego 50 ms de duración.
      expect(guardarSpy().traza.duracion_ms).toBe(50);
    });

    it('fecha_fin es posterior a fecha_inicio', async () => {
      const manejador = { handle: () => of({}) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
      });
      await esperarEscritura();

      const { traza } = guardarSpy();
      expect(traza.fecha_fin.getTime()).toBeGreaterThan(
        traza.fecha_inicio.getTime(),
      );
    });

    it('normaliza la ruta antes de guardarla', async () => {
      const manejador = { handle: () => of({}) };
      const ruta = `/events/${UUID}`;

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida(ruta)), manejador)
          .subscribe();
      });
      await esperarEscritura();

      expect(guardarSpy().traza.ruta).toBe('/events/:id');
    });

    it('guarda la traza con un identificador propio, no el de correlación', async () => {
      const manejador = { handle: () => of({}) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
      });
      await esperarEscritura();

      expect(guardarSpy().traza.id_traza).not.toBe(UUID);
      expect(guardarSpy().traza.id_traza).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('deja el identificador de usuario vacío en una petición sin autenticar', async () => {
      const manejador = { handle: () => of({}) };
      const peticion = peticionValida();
      delete (peticion as { user?: unknown }).user;

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticion), manejador)
          .subscribe();
      });
      await esperarEscritura();

      expect(guardarSpy().traza.id_usuario).toBeNull();
    });
  });

  describe('errores', () => {
    it('guarda el mensaje del fallo y el estado 500', async () => {
      const manejador = {
        handle: () => throwError(() => new Error('fallo controlado')),
      };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe({ error: () => undefined });
      });
      await esperarEscritura();

      const { traza } = guardarSpy();
      expect(traza.error).toContain('fallo controlado');
      expect(traza.estado_http).toBe(500);
    });

    it('propaga el error al que llama, sin tragárselo', () => {
      const manejador = {
        handle: () => throwError(() => new Error('fallo controlado')),
      };
      const errores: unknown[] = [];

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe({ error: (e) => errores.push(e) });
      });

      expect(errores).toHaveLength(1);
      expect((errores[0] as Error).message).toBe('fallo controlado');
    });

    it('guarda el estado que trae el error si lo declara', async () => {
      const error = Object.assign(new Error('sin permiso'), {
        status: 403,
      });
      const manejador = { handle: () => throwError(() => error) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe({ error: () => undefined });
      });
      await esperarEscritura();

      expect(guardarSpy().traza.estado_http).toBe(403);
    });
  });

  describe('rutas excluidas', () => {
    it.each(['/traces', '/traces/abc', '/metrics', '/health', '/health/live'])(
      'no instrumenta %s',
      (ruta) => {
        const manejador = { handle: () => of({}) };

        enContexto(UUID, () => {
          interceptor
            .intercept(construirContexto(peticionValida(ruta)), manejador)
            .subscribe();
        });

        expect(guardar).not.toHaveBeenCalled();
      },
    );

    it('sí instrumenta una ruta que solo empieza por una excluida', async () => {
      const manejador = { handle: () => of({}) };

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida('/traza')), manejador)
          .subscribe();
      });
      await esperarEscritura();

      expect(guardar).toHaveBeenCalledTimes(1);
    });

    it('no instrumenta peticiones que no son HTTP', () => {
      const contextoRpc = {
        getType: () => 'rpc',
        switchToHttp: () => ({
          getRequest: () => ({}),
          getResponse: () => ({}),
        }),
      } as unknown as ExecutionContext;
      const manejador = { handle: () => of({}) };

      interceptor.intercept(contextoRpc, manejador).subscribe();

      expect(guardar).not.toHaveBeenCalled();
    });
  });

  describe('si el repositorio falla', () => {
    it('no altera la respuesta de la petición', async () => {
      guardar.mockRejectedValue(new Error('la base de datos no responde'));
      const manejador = { handle: () => of({ resultado: 'ok' }) };
      const recibidos: unknown[] = [];

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe({
            next: (v) => recibidos.push(v),
            error: () => undefined,
          });
      });
      await esperarEscritura();

      expect(recibidos).toEqual([{ resultado: 'ok' }]);
    });

    it('tampoco convierte un error de la petición en un fallo del repositorio', async () => {
      guardar.mockRejectedValue(new Error('la base de datos no responde'));
      const manejador = {
        handle: () => throwError(() => new Error('fallo del controlador')),
      };
      const errores: Error[] = [];

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe({ error: (e) => errores.push(e as Error) });
      });
      await esperarEscritura();

      expect(errores).toHaveLength(1);
      expect(errores[0].message).toBe('fallo del controlador');
    });
  });

  describe('spans hijos', () => {
    /**
     * Petición que se resuelve a mano. Hace falta porque los spans se registran
     * mientras la petición está en curso: con un `of({})`, que emite de
     * inmediato, la traza se cerraría antes de que la prueba tuviera ocasión de
     * registrar ningún span.
     */
    const peticionEnCurso = () => {
      const respuesta = new Subject<unknown>();

      return {
        manejador: { handle: () => respuesta },
        responder: () => {
          respuesta.next({});
          respuesta.complete();
        },
      };
    };

    it('guarda el span con su nombre, su tipo y su estado', async () => {
      const { manejador, responder } = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
        const colector = contexto.getColector();
        const span = colector.iniciar('consultar eventos', TipoSpan.prisma);
        colector.cerrar(span, EstadoSpan.ok, { total: 3 });
        responder();
      });
      await esperarEscritura();

      const { traza, spans } = guardarSpy();
      expect(spans).toHaveLength(1);
      expect(spans[0].nombre).toBe('consultar eventos');
      expect(spans[0].tipo).toBe(TipoSpan.prisma);
      expect(spans[0].estado).toBe(EstadoSpan.ok);
      expect(spans[0].atributos).toEqual({ total: 3 });
      expect(spans[0].id_traza).toBe(traza.id_traza);
    });

    it('mide la duración del span con el reloj inyectado', async () => {
      const { manejador, responder } = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
        const colector = contexto.getColector();
        const span = colector.iniciar('consultar eventos', TipoSpan.prisma);
        colector.cerrar(span, EstadoSpan.ok);
        responder();
      });
      await esperarEscritura();

      // 50 ms por llamada, dos llamadas: inicio y cierre.
      expect(guardarSpy().spans[0].duracion_ms).toBe(50);
    });

    it('coloca el span raíz sin padre y los hijos debajo', async () => {
      const { manejador, responder } = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
        const colector = contexto.getColector();
        const raiz = colector.iniciar('peticion', TipoSpan.http);
        const hijo = colector.iniciar('validar token', TipoSpan.auth, raiz);
        colector.cerrar(hijo, EstadoSpan.ok);
        colector.cerrar(raiz, EstadoSpan.ok);
        responder();
      });
      await esperarEscritura();

      const { spans } = guardarSpy();
      const porNombre = new Map(spans.map((s) => [s.nombre, s]));
      expect(porNombre.get('peticion')?.parent_id).toBeNull();
      expect(porNombre.get('validar token')?.parent_id).toBe(
        porNombre.get('peticion')?.id_span,
      );
    });

    it('un span que falla se guarda con estado error y no rompe la petición', async () => {
      const { manejador, responder } = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
        const colector = contexto.getColector();
        const span = colector.iniciar('consultar eventos', TipoSpan.prisma);
        colector.cerrar(span, EstadoSpan.error, { motivo: 'sin permiso' });
        responder();
      });
      await esperarEscritura();

      const { spans } = guardarSpy();
      expect(spans[0].estado).toBe(EstadoSpan.error);
      expect(guardar).toHaveBeenCalledTimes(1);
    });

    it('no guarda un span sin cerrar, para no inventar una duración', async () => {
      const { manejador, responder } = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), manejador)
          .subscribe();
        contexto.getColector().iniciar('a medias', TipoSpan.prisma);
        responder();
      });
      await esperarEscritura();

      expect(guardarSpy().spans).toEqual([]);
    });

    it('da a cada petición su propio colector', async () => {
      const primera = peticionEnCurso();

      enContexto(UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), primera.manejador)
          .subscribe();
        const colector = contexto.getColector();
        const span = colector.iniciar('de la primera', TipoSpan.http);
        colector.cerrar(span, EstadoSpan.ok);
        primera.responder();
      });
      await esperarEscritura();

      const segunda = peticionEnCurso();

      enContexto(OTRO_UUID, () => {
        interceptor
          .intercept(construirContexto(peticionValida()), segunda.manejador)
          .subscribe();
        const colector = contexto.getColector();
        expect(colector.cerrados()).toEqual([]);
        segunda.responder();
      });
      await esperarEscritura();

      const llamadas = guardar.mock.calls;
      expect(llamadas[0][1].map((s) => s.nombre)).toEqual(['de la primera']);
      expect(llamadas[1][1]).toEqual([]);
    });
  });
});
