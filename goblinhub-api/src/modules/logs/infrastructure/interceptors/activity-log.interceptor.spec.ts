import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import type { PrismaService } from '../../../../connect/prisma.service';
import { ActivityLogInterceptor } from './activity-log.interceptor';
import { TracingContextService } from '../../../tracing/domain/services/tracing-context.service';

const CORRELATION_ID = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';

type Peticion = {
  method: string;
  originalUrl: string;
  url: string;
  headers: Record<string, string | undefined>;
  user?: { id?: string };
  ip?: string;
};

/** Fila que el interceptor pasa a `logs_Actividad.create`. */
type FilaLog = { data: Record<string, unknown> };

describe('ActivityLogInterceptor', () => {
  let crear: jest.Mock<Promise<unknown>, [FilaLog]>;
  let contexto: TracingContextService;
  let interceptor: ActivityLogInterceptor;

  const construirContexto = (peticion: Peticion) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => peticion,
        getResponse: () => ({ statusCode: 201 }),
      }),
    }) as unknown as ExecutionContext;

  const peticionDeMutacion = (): Peticion => ({
    method: 'POST',
    originalUrl: '/events',
    url: '/events',
    headers: { 'user-agent': 'jest' },
    user: { id: 'uuid-del-admin' },
  });

  beforeEach(() => {
    crear = jest.fn<Promise<unknown>, [FilaLog]>().mockResolvedValue({});
    contexto = new TracingContextService();
    interceptor = new ActivityLogInterceptor(
      { logs_Actividad: { create: crear } } as unknown as PrismaService,
      contexto,
    );
  });

  /**
   * `intercept` devuelve un observable frío: no hace nada hasta que se suscribe.
   * La escritura del log es asíncrona y el interceptor no la espera, así que
   * después de suscribirse hay que dejar correr la cola con `setImmediate`.
   */
  const ejecutarExito = (peticion: Peticion, conCorrelationId: boolean) => {
    const manejador: CallHandler = { handle: () => of({ id: 1 }) };
    const suscribirse = () =>
      interceptor.intercept(construirContexto(peticion), manejador).subscribe();

    if (conCorrelationId) {
      contexto.run(CORRELATION_ID, suscribirse);
    } else {
      suscribirse();
    }
  };

  const ejecutarError = (peticion: Peticion) => {
    const manejador: CallHandler = {
      handle: () => throwError(() => new Error('fallo controlado')),
    };
    interceptor
      .intercept(construirContexto(peticion), manejador)
      .subscribe({ error: () => undefined });
  };

  const esperarEscritura = () => new Promise((r) => setImmediate(r));

  /** Primera fila que el interceptor intentó guardar, con su tipo declarado. */
  const primeraFila = (): FilaLog => crear.mock.calls[0][0];

  it('incluye el identificador de correlación en datos_extra', async () => {
    ejecutarExito(peticionDeMutacion(), true);
    await esperarEscritura();

    expect(crear).toHaveBeenCalledTimes(1);
    expect(primeraFila().data['datos_extra']).toMatchObject({
      correlationId: CORRELATION_ID,
      statusCode: 201,
      userAgent: 'jest',
    });
  });

  it('conserva el resto de la información que ya se guardaba', async () => {
    ejecutarExito(peticionDeMutacion(), true);
    await esperarEscritura();

    const { data } = primeraFila();
    expect(data['accion']).toBe('POST /events');
    expect(data['id_usuario']).toBe('uuid-del-admin');
    expect(data['tipo']).toBe('success');
  });

  it('omite la clave si no hay ninguna petición que la haya publicado', async () => {
    ejecutarExito(peticionDeMutacion(), false);
    await esperarEscritura();

    const datos_extra = primeraFila().data['datos_extra'] as Record<
      string,
      unknown
    >;
    expect(datos_extra).not.toHaveProperty('correlationId');
    expect(datos_extra).toHaveProperty('statusCode');
  });

  it('incluye el identificador también en el log de error', async () => {
    contexto.run(CORRELATION_ID, () => ejecutarError(peticionDeMutacion()));
    await esperarEscritura();

    expect(primeraFila().data).toMatchObject({
      tipo: 'error',
      datos_extra: { correlationId: CORRELATION_ID, statusCode: 500 },
    });
  });

  it('no escribe log en una petición de lectura, pero tampoco la rompe', () => {
    const peticion: Peticion = {
      method: 'GET',
      originalUrl: '/events',
      url: '/events',
      headers: {},
    };
    const manejador: CallHandler = { handle: () => of([]) };

    const resultado = interceptor.intercept(
      construirContexto(peticion),
      manejador,
    );

    expect(resultado).toBeDefined();
    expect(crear).not.toHaveBeenCalled();
  });
});
