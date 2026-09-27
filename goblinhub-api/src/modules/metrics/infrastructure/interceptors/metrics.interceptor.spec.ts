import { HttpException, HttpStatus } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { type Observable, firstValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import type { MetricsService } from '../services/metrics.service';

type PeticionFalsa = {
  method: string;
  path: string;
  baseUrl?: string;
  route?: { path?: string | string[] };
};

/** `CallHandler` es un objeto con `handle()`, no una función suelta. */
function handler(flujo: Observable<unknown>): CallHandler {
  return { handle: () => flujo };
}

function contexto(
  peticion: PeticionFalsa,
  statusCode = 200,
  tipo: 'http' | 'rpc' = 'http',
): ExecutionContext {
  return {
    getType: () => tipo,
    switchToHttp: () => ({
      getRequest: () => peticion,
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsInterceptor', () => {
  let metricsService: jest.Mocked<Pick<MetricsService, 'registrarPeticion'>>;
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    metricsService = { registrarPeticion: jest.fn() };
    interceptor = new MetricsInterceptor(
      metricsService as unknown as MetricsService,
    );
  });

  it('registra método, ruta y estado de una petición correcta', async () => {
    const peticion: PeticionFalsa = {
      method: 'get',
      path: '/productos/9f3c2b1a-1111-2222-3333-444455556666',
      baseUrl: '/productos',
      route: { path: '/:id' },
    };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 200), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).toHaveBeenCalledTimes(1);
    const [metodo, ruta, status, duracion] =
      metricsService.registrarPeticion.mock.calls[0];
    expect(metodo).toBe('GET');
    expect(ruta).toBe('/productos/:id');
    expect(status).toBe(200);
    expect(duracion).toBeGreaterThanOrEqual(0);
  });

  it('usa la ruta con comodín para acotar la cardinalidad', async () => {
    const peticion: PeticionFalsa = {
      method: 'POST',
      path: '/auth/signin',
      baseUrl: '/auth',
      route: { path: '/signin' },
    };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 201), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).toHaveBeenCalledWith(
      'POST',
      '/auth/signin',
      201,
      expect.any(Number),
    );
  });

  it('sustituye identificadores cuando la ruta no trae patrón', async () => {
    const peticion: PeticionFalsa = {
      method: 'GET',
      path: '/eventos/42',
    };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 200), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).toHaveBeenCalledWith(
      'GET',
      '/eventos/:id',
      200,
      expect.any(Number),
    );
  });

  it('registra el estado de la excepción y la vuelve a lanzar', async () => {
    const peticion: PeticionFalsa = { method: 'GET', path: '/logs' };
    const error = new HttpException('fallo', HttpStatus.INTERNAL_SERVER_ERROR);

    await expect(
      firstValueFrom(
        interceptor.intercept(
          contexto(peticion, 500),
          handler(throwError(() => error)),
        ),
      ),
    ).rejects.toBe(error);

    expect(metricsService.registrarPeticion).toHaveBeenCalledWith(
      'GET',
      '/logs',
      500,
      expect.any(Number),
    );
  });

  it('no instrumenta la propia ruta de métricas', async () => {
    const peticion: PeticionFalsa = { method: 'GET', path: '/metrics' };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 200), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).not.toHaveBeenCalled();
  });

  it('no instrumenta contextos que no son HTTP', async () => {
    const peticion: PeticionFalsa = { method: 'GET', path: '/logs' };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 200, 'rpc'), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).not.toHaveBeenCalled();
  });

  it('normaliza la barra final', async () => {
    const peticion: PeticionFalsa = {
      method: 'GET',
      path: '/productos/',
      baseUrl: '/productos',
      route: { path: '/' },
    };

    await firstValueFrom(
      interceptor.intercept(contexto(peticion, 200), handler(of('ok'))),
    );

    expect(metricsService.registrarPeticion).toHaveBeenCalledWith(
      'GET',
      '/productos',
      200,
      expect.any(Number),
    );
  });
});
