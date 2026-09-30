import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AUDITORIA_REPOSITORY,
  type LogAuditoriaRepository,
  type RegistroAuditoria,
} from '../repositories/log-auditoria.repository';
import type { ResultadoAuditoria } from '../enums/resultado-auditoria.enum';

/** Lo que necesita un proceso automático para dejar constancia de su ejecución. */
export type RegistroProceso = {
  accion: string;
  recurso: string;
  resultado: ResultadoAuditoria;
  correlation_id?: string;
};

/**
 * Fachada única de escritura sobre `logs_auditoria`.
 *
 * Todo lo que deja constancia —el middleware de las peticiones y los procesos
 * automáticos— pasa por aquí, de modo que existe un único punto donde se decide
 * qué hacer cuando la base de datos no está disponible.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @Inject(AUDITORIA_REPOSITORY)
    private readonly repositorio: LogAuditoriaRepository,
  ) {}

  /**
   * Escribe el registro y traga el error.
   *
   * Se traga a propósito, igual que en `ActivityLogInterceptor`: una operación
   * que ya ha terminado —la respuesta está enviada o el scheduler va por su
   * segundo— no puede volver a fallar porque la auditoría no haya podido
   * guardarse. Lo que sí se hace es dejar constancia en el logger, que es
   * donde un fallo de este tipo tiene que ser visible.
   */
  async registrar(registro: RegistroAuditoria): Promise<void> {
    try {
      await this.repositorio.registrar(registro);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo guardar el registro de auditoria: ${message}`,
      );
    }
  }

  /**
   * Constancia de un proceso automático, que no tiene usuario detrás.
   *
   * `actor_tipo` es `sistema` y `actor_id` queda nulo: no hay sesión que
   * señalar. El `correlation_id` no existe en un scheduler porque no hay
   * petición que lo origine, así que se genera uno propio para que el registro
   * cumpla el criterio 1 de #212 y para que varias ejecuciones del mismo
   * proceso puedan distinguirse entre sí.
   */
  async registrarProceso(proceso: RegistroProceso): Promise<void> {
    const { accion, recurso, resultado, correlation_id } = proceso;

    await this.registrar({
      actor_tipo: 'sistema',
      actor_id: null,
      accion,
      recurso,
      resultado,
      correlation_id: correlation_id ?? randomUUID(),
    });
  }
}
