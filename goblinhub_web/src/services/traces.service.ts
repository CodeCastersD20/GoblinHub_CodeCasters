import api from "../lib/api";

/**
 * Cliente del visor de trazabilidad de #204.
 *
 * Se tipa contra el contrato de `GET /traces` y `GET /traces/:correlationId`, y
 * el conjunto de filtros es exactamente el que acepta la API: servicio,
 * operación (método y ruta), estado, periodo y despliegue. Añadir un filtro aquí
 * que el backend no valide daría al visor una opción que devuelve `400`.
 */

export type NivelTraza = "info" | "warn" | "error";
export type EstadoSpan = "ok" | "error";
export type TipoSpan = "http" | "auth" | "prisma" | "cron" | "redis";

export interface Traza {
  id_traza: string;
  correlation_id: string;
  servicio: string;
  metodo: string;
  ruta: string;
  estado_http: number;
  nivel: NivelTraza;
  duracion_ms: number;
  ambiente: string;
  id_usuario?: string | null;
  error?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface Span {
  id_span: string;
  parent_id: string | null;
  nombre: string;
  tipo: TipoSpan;
  duracion_ms: number;
  estado: EstadoSpan;
  atributos: Record<string, unknown> | null;
  fecha_inicio: string;
  hijos: Span[];
}

export interface PaginatedTraces {
  data: Traza[];
  /** `null` cuando la consulta no pidió el recuento. */
  total: number | null;
  page: number;
  limit: number;
}

export interface TraceDetail {
  traza: Traza;
  pasos: Span[];
}

export interface GetTracesParams {
  page?: number;
  limit?: number;
  servicio?: string;
  metodo?: string;
  ruta?: string;
  estado?: number;
  ambiente?: string;
  desde?: string;
  hasta?: string;
  includeTotal?: boolean;
}

export const getTraces = (params?: GetTracesParams) =>
  api.get<PaginatedTraces>("/traces", { params });

export const getTraceByCorrelationId = (correlationId: string) =>
  api.get<TraceDetail>(`/traces/${encodeURIComponent(correlationId)}`);
