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
import { RedactionService } from '../../domain/services/redaction.service';
import { TracingConfigService } from '../../domain/services/tracing-config.service';
import {
  nivelDeEstado,
  type NivelTraza,
} from '../../domain/enums/nivel-traza.enum';
import { RelojSistema, type Reloj } from '../../domain/services/reloj';
import { Traza } from '../../domain/entities/traza.entity';
import { Span } from '../../domain/entities/span.entity';

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
    private readonly redaccion: RedactionService,
    private readonly configuracion: TracingConfigService,
    // El reloj entra por token y no como pará suelto porque Nest intentaría
    // resolverlo como una dependencia más; así una prueba puede sustituirlo
    // entera sin tocar el resto del cableado.
    @Optional()
    @Inject(RelojSistema)
    private readonly reloj: Reloj = new RelojSistema(),
  ) {}

  /**
   * El entorno y el servicio van en la traza para poder distinguir un fallo de
   * desarrollo de uno de producción y consultar por servicio sin mirar el
   * código. Los dos los decide `TracingConfigService`, que los resolvió al
   * arrancar: leer `process.env` aquí lo convertiría en trabajo por petición.
   */
  private get ambiente(): string {
    return this.configuracion.ambiente;
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
      const nivel = nivelDeEstado(estadoHttp);

      // El corte por nivel ocurre aquí y no en el repositorio: es una decisión de
      // la instrumentación, y saltarse la escritura entera es lo que evita gastar
      // una transacción por una traza que nadie va a mirar.
      if (!this.configuracion.guarda(nivel)) {
        return;
      }

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
        nivel,
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
    nivel: NivelTraza;
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
      // El mensaje de error pasa por la misma redacción que los atributos: un
      // `throw` puede llevar en el mensaje justo el valor que se negaba a
      // guardar como secreto. Se serializa porque la columna es de texto y la
      // redacción devuelve JSON.
      datos.error === null ? null : this.redactarMensaje(datos.error),
      datos.nivel,
      this.configuracion.servicio,
    );

    try {
      await this.repositorio.guardar(
        traza,
        this.redactarSpans(this.contexto.getColector().cerrados()),
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
   * `redactar` devuelve `Json`, y pasarlo por `String()` daría
   * `[object Object]` si alguna vez el mensaje llegara como objeto. Un mensaje
   * de error es texto, así que se devuelve tal cual cuando lo es, y solo se
   * serializa con `JSON.stringify` en cualquier otro caso.
   */
  private redactarMensaje(mensaje: string): string {
    const redactado = this.redaccion.redactar(mensaje);

    return typeof redactado === 'string'
      ? redactado
      : JSON.stringify(redactado);
  }

  /**
   * La redacción se aplica **antes** de la llamada a Prisma y nunca al leer
   * (FR-017). Enmascarar en la consulta no serviría de nada: si el secreto ya
   * está escrito, quien tenga acceso a la tabla lo tiene igual.
   *
   * Devuelve spans nuevos en lugar de mutar los recibidos porque el colector
   * puede seguir vivo: mutarlos dejaría el mismo objeto en dos estados
   * distintos según quién lo lea después.
   */
  private redactarSpans(spans: Span[]): Span[] {
    return spans.map((span) => {
      if (span.atributos === null || span.atributos === undefined) {
        return span;
      }

      return new Span(
        span.id_span,
        span.id_traza,
        span.nombre,
        span.tipo,
        span.duracion_ms,
        span.estado,
        span.fecha_inicio,
        span.parent_id,
        this.redaccion.redactar(span.atributos),
      );
    });
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
