import type { Request, Response } from 'express';
import { AuditoriaMiddleware } from './auditoria.middleware';
import { AuditoriaService } from '../../domain/services/auditoria.service';
import { PathNormalizerService } from '../../../tracing/domain/services/path-normalizer.service';
import type { RegistroAuditoria } from '../../domain/repositories/log-auditoria.repository';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Cubre los tres casos que el criterio 5 de #212 pide probar —permitido,
 * rechazado y fallido— sobre la única vía de escritura de la auditoría.
 */
describe('AuditoriaMiddleware', () => {
  let auditoria: {
    registrar: jest.Mock<Promise<void>, [RegistroAuditoria]>;
  };
  let middleware: AuditoriaMiddleware;
  let siguiente: jest.Mock;

  const crearPeticion = (
    metodo: string,
    ruta: string,
    opciones: { user?: { id?: string }; correlationId?: string } = {},
  ): Request => {
    const headers: Record<string, string> = {};
    if (opciones.correlationId !== undefined) {
      headers['x-request-id'] = opciones.correlationId;
    }

    return {
      method: metodo,
      originalUrl: ruta,
      url: ruta,
      headers,
      ...(opciones.user !== undefined ? { user: opciones.user } : {}),
    } as unknown as Request;
  };

  const crearRespuesta = (statusCode: number) => {
    const alTerminar: Array<() => void> = [];
    const respuesta = {
      statusCode,
      on: (evento: string, callback: () => void) => {
        if (evento === 'finish') alTerminar.push(callback);
      },
    };

    return {
      respuesta: respuesta as unknown as Response,
      terminar: () => alTerminar.forEach((callback) => callback()),
    };
  };

  /**
   * Ejecuta el middleware y dispara el final de la respuesta, que es cuando el
   * código de estado ya es definitivo y por tanto cuando se decide el resultado.
   */
  const ejecutar = (
    metodo: string,
    ruta: string,
    statusCode: number,
    opciones: { user?: { id?: string }; correlationId?: string } = {},
  ) => {
    const peticion = crearPeticion(metodo, ruta, opciones);
    const { respuesta, terminar } = crearRespuesta(statusCode);

    middleware.use(peticion, respuesta, siguiente);
    terminar();

    return {
      peticion,
      ultimoRegistro: auditoria.registrar.mock.calls.at(-1)?.[0],
    };
  };

  beforeEach(() => {
    auditoria = {
      registrar: jest
        .fn<Promise<void>, [RegistroAuditoria]>()
        .mockResolvedValue(undefined),
    };
    middleware = new AuditoriaMiddleware(
      auditoria as unknown as AuditoriaService,
      new PathNormalizerService(),
    );
    siguiente = jest.fn();
  });

  it('registra una operación permitida con actor, acción, recurso, resultado y correlación', () => {
    const actorId = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';
    const correlationId = 'a1b2c3d4-1111-4222-8333-444455556666';

    const { ultimoRegistro } = ejecutar('POST', '/events/123', 201, {
      user: { id: actorId },
      correlationId,
    });

    expect(auditoria.registrar).toHaveBeenCalledTimes(1);
    expect(ultimoRegistro).toEqual({
      actor_tipo: 'usuario',
      actor_id: actorId,
      accion: 'POST',
      recurso: '/events/:id',
      resultado: 'exitoso',
      correlation_id: correlationId,
    });
  });

  it('registra un intento rechazado (401) sin actor', () => {
    const { ultimoRegistro } = ejecutar('POST', '/auth/login', 401, {
      correlationId: 'a1b2c3d4-1111-4222-8333-444455556666',
    });

    expect(ultimoRegistro).toMatchObject({
      actor_tipo: 'anonimo',
      actor_id: null,
      resultado: 'rechazado',
    });
  });

  it('registra un intento rechazado (403) conservando el actor que sí había', () => {
    const actorId = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';

    const { ultimoRegistro } = ejecutar('DELETE', '/events/9', 403, {
      user: { id: actorId },
    });

    expect(ultimoRegistro).toMatchObject({
      actor_tipo: 'usuario',
      actor_id: actorId,
      resultado: 'rechazado',
    });
  });

  it('registra una operación fallida con el código que la describe', () => {
    const { ultimoRegistro } = ejecutar('PUT', '/products/7', 500, {
      user: { id: '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73' },
    });

    expect(ultimoRegistro).toMatchObject({
      accion: 'PUT',
      resultado: 'fallido',
    });
  });

  it('no registra verbos de solo lectura', () => {
    ejecutar('GET', '/events', 200);
    ejecutar('HEAD', '/events', 200);
    ejecutar('OPTIONS', '/events', 204);

    expect(auditoria.registrar).not.toHaveBeenCalled();
    expect(siguiente).toHaveBeenCalledTimes(3);
  });

  it('no audita sus propias rutas de consulta', () => {
    ejecutar('POST', '/audit-logs', 201);

    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('descarta la query string antes de guardar el recurso', () => {
    const { ultimoRegistro } = ejecutar('POST', '/events?origen=api', 201);

    expect(ultimoRegistro?.recurso).toBe('/events');
  });

  it('genera un correlación cuando la petición no trae la cabecera', () => {
    const { ultimoRegistro } = ejecutar('POST', '/events', 201);

    expect(ultimoRegistro?.correlation_id).toMatch(UUID_V4);
  });

  it('llama a next una sola vez y antes de que se escriba el registro', () => {
    const orden: string[] = [];
    siguiente.mockImplementation(() => orden.push('siguiente'));
    auditoria.registrar.mockImplementation(() => {
      orden.push('registro');
      return Promise.resolve();
    });

    ejecutar('POST', '/events', 201);

    expect(orden).toEqual(['siguiente', 'registro']);
  });
});
