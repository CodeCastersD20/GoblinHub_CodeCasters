import { LogAuditoria } from '../entities/log-auditoria.entity';
import type { TipoActor } from '../enums/tipo-actor.enum';
import type { ResultadoAuditoria } from '../enums/resultado-auditoria.enum';

/**
 * Filtros de `GET /audit-logs`, ya traducidos al dominio. Son exactamente los
 * cinco que nombra el criterio 3 de #212 —actor, acción, recurso, resultado y
 * rango de fechas— y no hay más: un parámetro que nadie pidió es superficie de
 * API que hay que mantener.
 *
 * Todos opcionales. Un filtro ausente se omite del `where` en lugar de llegar
 * como `undefined` o como `''`, porque en Prisma la cadena vacía es una
 * condición real que no devuelve nada.
 */
export type FiltrosAuditoria = {
  actor?: string;
  accion?: string;
  recurso?: string;
  resultado?: ResultadoAuditoria;
  desde?: Date;
  hasta?: Date;
};

export type PaginacionAuditoria = {
  page: number;
  limit: number;
  includeTotal: boolean;
};

/**
 * `total` es `null` cuando no se pidió el recuento. Distinguirlo de `0` importa:
 * cero afirma que no hay resultados, mientras que `null` afirma que no se ha
 * preguntado, y el visor no debe mostrar «0» donde en realidad no lo sabe.
 */
export type ListadoAuditoria = {
  registros: LogAuditoria[];
  total: number | null;
};

/**
 * Lo que se envía a escribir. No lleva `id_auditoria` ni `fecha_hora` porque los
 * genera la base de datos: quien registra una acción elige el contenido, no la
 * clave ni el instante en que se produce.
 */
export type RegistroAuditoria = {
  actor_tipo: TipoActor;
  actor_id: string | null;
  accion: string;
  recurso: string;
  resultado: ResultadoAuditoria;
  correlation_id: string;
};

/**
 * Repositorio de la tabla `logs_auditoria`.
 *
 * Expone **solo** `registrar` (una inserción) y `listar` (una consulta). No
 * existe `actualizar` ni `eliminar` en la interfaz ni en la implementación: la
 * inmutabilidad del criterio 2 de #212 se garantiza aquí, porque un registro
 * que no se puede pedir modificar tampoco se puede modificar por accidente.
 */
export abstract class LogAuditoriaRepository {
  /**
   * Inserta un registro nuevo. Devuelve el error si la escritura falla: quien
   * llama decide qué hacer, y en la práctica lo único que puede hacer es
   * registrar el fallo en su propio logger sin tumbar la operación.
   */
  abstract registrar(registro: RegistroAuditoria): Promise<void>;

  /**
   * `GET /audit-logs`. Devuelve la página pedida en orden descendente por
   * `fecha_hora`, que es como se lee un historial: lo más reciente primero.
   *
   * `includeTotal` se propaga para que la implementación decida si gasta una
   * segunda consulta en el `COUNT`.
   */
  abstract listar(
    filtros: FiltrosAuditoria,
    paginacion: PaginacionAuditoria,
  ): Promise<ListadoAuditoria>;
}

/**
 * Token de inyección. Apunta a la propia clase abstracta, igual que
 * `TRAZA_REPOSITORY`, y no a un `Symbol`: el resto de módulos recientes usan la
 * clase como token y así el módulo se lee con la vista de un solo golpe.
 */
export const AUDITORIA_REPOSITORY = LogAuditoriaRepository;
