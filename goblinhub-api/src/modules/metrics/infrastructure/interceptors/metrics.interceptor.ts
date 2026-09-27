import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service';
import { RUTAS_EXCLUIDAS } from '../../domain/entities/metric-set.entity';

/**
 * `Request` de Express declara `route: any`; se omite para poder tipar el
 * patrón de ruta y no arrastrar un `any` en todo el interceptor.
 */
type PeticionExpress = Omit<Request, 'route'> & {
  route?: { path?: string | string[] };
};

/**
 * Instrumenta cada petición HTTP con su duración y su código de estado
 * (FR-002, FR-003). Es el equivalente de métricas de
 * `ActivityLogInterceptor`, pero sin escritura en base de datos.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const peticion = context.switchToHttp().getRequest<PeticionExpress>();
    const respuesta = context.switchToHttp().getResponse<Response>();
    const ruta = this.resolverRuta(peticion);

    if (this.estaExcluida(ruta)) {
      return next.handle();
    }

    const metodo = peticion.method.toUpperCase();
    const inicio = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        this.registrar(metodo, ruta, respuesta.statusCode, inicio);
      }),
      catchError((error: unknown) => {
        this.registrar(metodo, ruta, this.estadoDeError(error), inicio);
        return throwError(() => error);
      }),
    );
  }

  private registrar(
    metodo: string,
    ruta: string,
    status: number,
    inicio: bigint,
  ): void {
    const duracionSegundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    this.metricsService.registrarPeticion(
      metodo,
      ruta,
      status,
      duracionSegundos,
    );
  }

  /**
   * Devuelve la ruta con comodín (`/productos/:id`) en lugar de la literal.
   * Etiquetar con `/productos/9f3c-...` crearía una serie por cada
   * identificador y el基数 de la métrica crecería sin límite.
   */
  private resolverRuta(peticion: PeticionExpress): string {
    const patron = peticion.route?.path;
    const base = peticion.baseUrl ?? '';

    if (typeof patron === 'string') {
      return this.normalizar(`${base}${patron}`);
    }

    if (Array.isArray(patron) && patron.every((p) => typeof p === 'string')) {
      return this.normalizar(`${base}${patron[0]}`);
    }

    return this.normalizar(this.sustituirIdentificadores(peticion.path ?? '/'));
  }

  /** Red de seguridad: convierte segmentos dinámicos en comodines. */
  private sustituirIdentificadores(path: string): string {
    return path
      .split('/')
      .map((segmento) => {
        if (/^\d+$/.test(segmento)) {
          return ':id';
        }
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            segmento,
          )
        ) {
          return ':uuid';
        }
        return segmento;
      })
      .join('/');
  }

  private normalizar(path: string): string {
    const sinQuery = path.split('?')[0] ?? '/';
    const limpio = sinQuery.replace(/\/+$/, '');
    return limpio === '' ? '/' : limpio;
  }

  private estaExcluida(ruta: string): boolean {
    return RUTAS_EXCLUIDAS.some(
      (excluida) => ruta === excluida || ruta.startsWith(`${excluida}/`),
    );
  }

  private estadoDeError(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    return 500;
  }
}
