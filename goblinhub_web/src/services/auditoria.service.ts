import api from "../lib/api";

/**
 * Cliente del visor de auditoría de #212.
 *
 * Se tipa contra el contrato de `GET /audit-logs`, y el conjunto de filtros es
 * exactamente los cinco que acepta la API —actor, acción, recurso, resultado y
 * rango de fechas—. Un filtro inventado aquí llegaría al backend como
 * parámetro desconocido y devolvería un `400`.
 */

export type TipoActor = "usuario" | "anonimo" | "sistema";
export type ResultadoAuditoria = "exitoso" | "rechazado" | "fallido";

export const RESULTADOS_AUDITORIA: readonly ResultadoAuditoria[] = [
  "exitoso",
  "rechazado",
  "fallido",
];

/** Datos del usuario resueltos al leer, nunca guardados en la tabla. */
export interface ActorAuditoria {
  nombre: string;
  apellidos: string;
  rol: string;
}

export interface LogAuditoria {
  id_auditoria: string;
  actor_tipo: TipoActor;
  actor_id: string | null;
  accion: string;
  recurso: string;
  resultado: ResultadoAuditoria;
  correlation_id: string;
  fecha_hora: string;
  actor: ActorAuditoria | null;
}

export interface PaginatedAuditLogs {
  data: LogAuditoria[];
  /** `null` cuando la consulta no pidió el recuento. */
  total: number | null;
  page: number;
  limit: number;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  actor?: string;
  accion?: string;
  recurso?: string;
  resultado?: ResultadoAuditoria;
  desde?: string;
  hasta?: string;
  includeTotal?: boolean;
}

export const getAuditLogs = (params?: GetAuditLogsParams) =>
  api.get<PaginatedAuditLogs>("/audit-logs", { params });
