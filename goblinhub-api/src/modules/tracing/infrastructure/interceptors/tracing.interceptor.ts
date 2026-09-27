import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { TrazaRepository } from '../../domain/repositories/traza.repository';
import { TracingContextService } from '../../domain/services/tracing-context.service';
import { PathNormalizerService } from '../../domain/services/path-normalizer.service';
import { RelojSistema, type Reloj } from '../../domain/services/reloj';
import { Traza } from '../../domain/entities/traza.entity';

type PeticionConUsuario = Request & { user?: { id?: string } };

/**
 * Rutas que no se instrumentan. Se comparan por prefijo de segmento, no con
 * `includes`: `/traces` y `/metrics` las usa el propio observabilidad para
 * mostrarse, y una traza de cada consulta al visor duplicaría el volumen sin
 * aportar nada. Con `includes`, `/traces-listo` se quedaría sin instrumentar sin
 * querer.
 */
const RUTAS_EXCLUIDAS = ['/traces', '/metrics', '/health'] as const;

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  constructor(
    private readonly repositorio: TrazaRepository,
    private readonly contexto: TracingContextService,
    private readonly normalizador: PathNormalizerService,
    // El reloj entra por token y no como pará suelto porque Nest intentaría
    // resolverlo como una dependencia más; así una prueba puede sustituirlo
    // entera sin tocar el resto del cableado.
    @Optional()
    @Inject(RelojSistema)
    private readonly reloj: Reloj = new RelojSistema(),
  ) {}

  /**
   * El entorno va en la traza para poder distinguir un fallo de desarrollo de
   * uno de producción sin mirar la tabla. Se lee aquí y no en el constructor
   * para que no cuente como una dependencia que Nest tenga que resolver.
   */
  private get ambiente(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const peticion = context.switchToHttp().getRequest<PeticionConUsuario>();
    const respuesta = context.switchToHttp().getResponse<Response>();
    const ruta = this.rutaDe(peticion);

    if (this.estaExcluida(ruta)) {
      return next.handle();
    }

    const inicio = this.reloj.ahora();
    const fechaInicio = this.reloj.fecha();

    /**
     * Cierra la traza con el desenlace que sea. Se factoriza en una función
     * porque el camino feliz y el de error comparten todo menos el estado y el
     * mensaje, y duplicar la construcción de la traza invitaba a que uno de los
     * dos caminos se quedara sin actualizar al tocar el otro.
     */
    const finalizar = (estadoHttp: number, error: string | null) => {
      void this.persistir({
        idTraza: this.contexto.getIdTraza() ?? randomUUID(),
        correlationId: this.contexto.get() ?? randomUUID(),
        metodo: peticion.method.toUpperCase(),
        ruta: this.normalizador.normalizar(ruta),
        estadoHttp,
        inicio,
        fechaInicio,
        idUsuario: peticion.user?.id,
        error,
      });
    };

    return next.handle().pipe(
      tap(() => finalizar(respuesta.statusCode, null)),
      catchError((error: unknown) => {
        finalizar(
          this.estadoDelError(error),
          error instanceof Error ? error.message : 'Error no identificado',
        );

        return throwError(() => error);
      }),
    );
  }

  /**
   * Se escribe sin `await` a propósito (FR-010): la traza no forma parte de la
   * respuesta que espera el cliente, y esperarla añadiría la latencia de una
   * escritura a cada petición. El fallo se registra y se descarta, para que la
   * instrumentación nunca pueda tumbar la API.
   */
  private async persistir(datos: {
    idTraza: string;
    correlationId: string;
    metodo: string;
    ruta: string;
    estadoHttp: number;
    inicio: number;
    fechaInicio: Date;
    idUsuario?: string;
    error: string | null;
  }): Promise<void> {
    const fin = this.reloj.ahora();

    const traza = new Traza(
      datos.idTraza,
      datos.correlationId,
      datos.metodo,
      datos.ruta,
      datos.estadoHttp,
      Math.max(0, Math.round(fin - datos.inicio)),
      this.ambiente,
      datos.fechaInicio,
      this.reloj.fecha(),
      datos.idUsuario ?? null,
      datos.error,
    );

    try {
      await this.repositorio.guardar(
        traza,
        this.contexto.getColector().cerrados(),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo guardar la traza ${traza.correlation_id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  /**
   * `path` es la ruta sin query string; `originalUrl` la incluye. Se prefiere
   * `path` porque un identificador en la query no debe formar parte de la ruta
   * normalizada, que solo chiama segmentos.
   */
  private rutaDe(peticion: PeticionConUsuario): string {
    return peticion.path ?? peticion.originalUrl ?? '/';
  }

  private estaExcluida(ruta: string): boolean {
    return RUTAS_EXCLUIDAS.some(
      (excluida) => ruta === excluida || ruta.startsWith(`${excluida}/`),
    );
  }

  /** Un `HttpException` trae su estado en `getStatus()`; el resto es un 500. */
  private estadoDelError(error: unknown): number {
    const candidato = error as { getStatus?: () => number; status?: number };

    if (typeof candidato?.getStatus === 'function') {
      return candidato.getStatus();
    }

    return typeof candidato?.status === 'number' ? candidato.status : 500;
  }
}
