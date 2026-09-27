import type { Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { TracingContextService } from '../../domain/services/tracing-context.service';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('CorrelationIdMiddleware', () => {
  let contexto: TracingContextService;
  let middleware: CorrelationIdMiddleware;
  let siguiente: jest.Mock;

  const crearPeticion = (cabeceras: Record<string, string>): Request =>
    ({
      method: 'GET',
      originalUrl: '/events',
      url: '/events',
      headers: { ...cabeceras },
    }) as unknown as Request;

  const crearRespuesta = () => {
    const escritas: Record<string, string> = {};
    const respuesta = {
      setHeader: (nombre: string, valor: string) => {
        escritas[nombre] = valor;
      },
      getHeader: (nombre: string) => escritas[nombre],
    };
    return { respuesta: respuesta as unknown as Response, escritas };
  };

  const ejecutar = (cabeceras: Record<string, string>) => {
    const peticion = crearPeticion(cabeceras);
    const { respuesta, escritas } = crearRespuesta();
    middleware.use(peticion, respuesta, siguiente);
    return {
      peticion,
      escritas,
      valorPublicado: contexto.getOrCreate(),
    };
  };

  beforeEach(() => {
    contexto = new TracingContextService();
    middleware = new CorrelationIdMiddleware(contexto);
    siguiente = jest.fn();
  });

  it('conserva un X-Request-Id válido y lo devuelve en la respuesta', () => {
    const uuid = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';

    const { escritas } = ejecutar({ 'x-request-id': uuid });

    expect(escritas['X-Request-Id']).toBe(uuid);
  });

  it('publica el identificador recibido para que lo lean los módulos internos', () => {
    const uuid = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';
    let publicado: string | undefined;

    const peticion = crearPeticion({ 'x-request-id': uuid });
    const { respuesta } = crearRespuesta();
    siguiente.mockImplementation(() => {
      publicado = contexto.get();
    });

    middleware.use(peticion, respuesta, siguiente);

    expect(publicado).toBe(uuid);
  });

  it('genera un UUID v4 cuando no llega la cabecera', () => {
    const { escritas } = ejecutar({});

    expect(escritas['X-Request-Id']).toMatch(UUID_V4);
  });

  it('descarta un X-Request-Id que no es UUID y genera otro', () => {
    const { escritas, peticion } = ejecutar({
      'x-request-id': 'no-es-un-uuid',
    });

    expect(escritas['X-Request-Id']).toMatch(UUID_V4);
    // El valor recibido no debe quedar en la petición: si lo leyera alguien
    // más adelante, se guardaría sin validar (FR-002).
    expect(peticion.headers['x-request-id']).toBe(escritas['X-Request-Id']);
  });

  it('descarta un X-Request-Id en mayúsculas, sin guiones o con saltos de línea', () => {
    const variantes = [
      '3F8C1E2A-9B4D-4C7E-8A1F-2D6B5E0C9A73',
      '3f8c1e2a9b4d4c7e8a1f2d6b5e0c9a73',
      '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73\r\nX-Inyectada: 1',
    ];

    for (const variante of variantes) {
      const { escritas } = ejecutar({ 'x-request-id': variante });
      expect(escritas['X-Request-Id']).toMatch(UUID_V4);
    }
  });

  it('descarta un X-Request-Id que supera los 64 caracteres', () => {
    const { escritas } = ejecutar({ 'x-request-id': 'a'.repeat(65) });

    expect(escritas['X-Request-Id']).toMatch(UUID_V4);
  });

  it('deriva el identificador del trace-id de un traceparent válido', () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';

    const { escritas } = ejecutar({
      traceparent: `00-${traceId}-00f067aa0ba902b7-01`,
    });

    expect(escritas['X-Request-Id']).toBe(traceId);
  });

  it('ignora un traceparent mal formado sin romper la petición', () => {
    const malformados = [
      '00-4bf92f3577b34da6a3ce929d0e0e4736-01',
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra',
      'version-invalida-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      '00-ZZZ2f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    ];

    for (const traceparent of malformados) {
      const { escritas } = ejecutar({ traceparent });
      expect(escritas['X-Request-Id']).toMatch(UUID_V4);
    }
  });

  it('prefiere el X-Request-Id válido sobre el traceparent', () => {
    const uuid = '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73';

    const { escritas } = ejecutar({
      'x-request-id': uuid,
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });

    expect(escritas['X-Request-Id']).toBe(uuid);
  });

  it('cae en el traceparent cuando el X-Request-Id no es válido', () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';

    const { escritas } = ejecutar({
      'x-request-id': 'no-es-un-uuid',
      traceparent: `00-${traceId}-00f067aa0ba902b7-01`,
    });

    expect(escritas['X-Request-Id']).toBe(traceId);
  });

  it('llama a next una sola vez en todos los casos', () => {
    ejecutar({});
    ejecutar({ 'x-request-id': '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73' });
    ejecutar({ traceparent: 'basura' });

    expect(siguiente).toHaveBeenCalledTimes(3);
  });
});
