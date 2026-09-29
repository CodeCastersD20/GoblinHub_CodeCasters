import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { TracingContextService } from '../../domain/services/tracing-context.service';

/**
 * Solo se acepta el formato exacto y en minúsculas. Aceptar variantes laxas
 * permitiría escribir saltos de línea en la salida de la consola, que es
 * justamente lo que un valor no validado podría provocar.
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** `version-format-traceid-parentid-flags` del estándar W3C Trace Context. */
const TRACEPARENT = /^[\da-f]{2}-([\da-f]{32})-[\da-f]{16}-[\da-f]{2}$/;

/** Tope de longitud: sin él, un cliente escribiría datos arbitrarios por petición. */
const LONGITUD_MAXIMA = 64;

/**
 * Resuelve el identificador de correlación de cada petición (FR-001, FR-002,
 * FR-003) y lo publica en el contexto para que lo lean el log de actividad y
 * los pasos internos sin que se lo pasen por parámetro.
 *
 * El identificador viaja siempre en la cabecera de respuesta, venga o no de
 * cliente, y se sobrescribe en la petición: el valor que otros módulos leen es
 * siempre el validado, nunca el arbitrario que enviara el cliente (FR-002).
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly contexto: TracingContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = this.resolver(
      req.headers['x-request-id'],
      req.headers['traceparent'],
    );

    req.headers['x-request-id'] = correlationId;
    res.setHeader('X-Request-Id', correlationId);

    this.contexto.run(correlationId, () => next());
  }

  private resolver(
    recibido: string | string[] | undefined,
    traceparent: string | string[] | undefined,
  ): string {
    const candidato = typeof recibido === 'string' ? recibido : '';

    if (
      candidato.length > 0 &&
      candidato.length <= LONGITUD_MAXIMA &&
      UUID_V4.test(candidato)
    ) {
      return candidato;
    }

    const delTraceparent = this.extraerTraceId(traceparent);
    if (delTraceparent !== null) {
      return delTraceparent;
    }

    return randomUUID();
  }

  /** Un `traceparent` mal formado se ignora en silencio: no debe tumbar la petición. */
  private extraerTraceId(
    cabecera: string | string[] | undefined,
  ): string | null {
    const valor = typeof cabecera === 'string' ? cabecera : '';
    return TRACEPARENT.exec(valor)?.[1] ?? null;
  }
}
