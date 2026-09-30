import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { PathNormalizerService } from '../../../tracing/domain/services/path-normalizer.service';
import { AuditoriaService } from '../../domain/services/auditoria.service';
import { resultadoDeEstado } from '../../domain/enums/resultado-auditoria.enum';

/** Solo los verbos que cambian estado sobre un recurso (alcance de #212). */
const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * El visor de auditoría consulta su propia tabla con `GET`, pero la exclusión
 * está declarada para que una eventual escritura sobre la propia auditoría —un
 * `POST /audit-logs` añadido mañana— no se audite a sí misma en bucle.
 */
const RUTAS_EXCLUIDAS = ['/audit-logs'];

type RequestConUsuario = Request & {
  user?: {
    id?: string;
  };
};

/**
 * Única vía de escritura de la auditoría para peticiones HTTP (#212).
 *
 * Corre como middleware y no como interceptor porque el interceptor no llega a
 * ejecutarse cuando un guard devuelve `401` o `403`: los guards van antes en la
 * cadena, y justamente esos intentos rechazados son los que la auditoría tiene
 * que registrar. Escuchando el final de la respuesta se cubren los tres casos
 * del criterio con una sola vía de escritura:
 *
 * - `< 400` → `exitoso` (permitido)
 * - `401` / `403` → `rechazado`
 * - resto de `>= 400` → `fallido`
 *
 * El registro se escribe al terminar la respuesta, cuando el código de estado
 * ya es definitivo, y de forma asíncrona: no forma parte del tiempo que tarda
 * la petición en responder.
 */
@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  constructor(
    private readonly auditoria: AuditoriaService,
    private readonly normalizador: PathNormalizerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!METODOS_MUTANTES.has(req.method.toUpperCase())) {
      next();
      return;
    }

    const ruta = this.ruta(req);

    if (RUTAS_EXCLUIDAS.some((excluida) => ruta.startsWith(excluida))) {
      next();
      return;
    }

    const correlationId = this.correlationId(req);
    // Se normaliza antes de responder: `/events/123` y `/events/456` son el
    // mismo recurso, y sin esta sustitución cada identificador crearía su propia
    // fila y el filtro por recurso no serviría para nada.
    const recurso = this.normalizador.normalizar(ruta);

    res.on('finish', () => {
      // El actor se resuelve aquí y no al entrar: el middleware corre antes que
      // los guards, y es el guard quien identifica al usuario y escribe
      // `req.user`. Resolviéndolo en el cierre —que se ejecuta al terminar la
      // respuesta— se captura a quien efectivamente hizo la operación, y no la
      // sesión que había cuando aún nadie había mirado la cabecera.
      const actorId = this.actorId(req);

      void this.auditoria.registrar({
        actor_tipo: actorId === null ? 'anonimo' : 'usuario',
        actor_id: actorId,
        accion: req.method.toUpperCase(),
        recurso,
        resultado: resultadoDeEstado(res.statusCode),
        correlation_id: correlationId,
      });
    });

    next();
  }

  private ruta(req: Request): string {
    const rawPath = req.originalUrl || req.url || '/';
    return rawPath.split('?')[0] || '/';
  }

  /**
   * El identificador que ya validó y sobrescribió `CorrelationIdMiddleware` en
   * la cabecera de la petición. Se lee de ahí y no del contexto de correlación
   * porque este callback se ejecuta al terminar la respuesta, fuera del
   * contexto asíncrono en el que ese middleware lo publicó.
   */
  private correlationId(req: Request): string {
    const cabecera = req.headers['x-request-id'];
    return typeof cabecera === 'string' && cabecera.length > 0
      ? cabecera
      : randomUUID();
  }

  /**
   * `null` cuando no hay sesión: una petición sin autenticar o una que fue
   * rechazada antes de que el guard llegara a identificar al usuario. Ahí es
   * donde `SupabaseAuthGuard` deja el `401`.
   *
   * `user` no forma parte del `Request` de Express: lo añade el guard sobre la
   * misma petición, de ahí que haya que mirarlo con el tipo propio.
   */
  private actorId(req: Request): string | null {
    return (req as RequestConUsuario).user?.id ?? null;
  }
}
