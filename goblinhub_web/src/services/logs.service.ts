import api from "../lib/api";

export type TipoLog = "success" | "info" | "warning" | "error";

export interface LogEntity {
  id_log: string;
  tipo: TipoLog;
  accion: string;
  mensaje: string;
  id_usuario?: string | null;
  ip_address?: string | null;
  datos_extra?: unknown | null;
  fecha_hora: string;
  usuario?: {
    nombre: string;
    apellidos: string;
    rol?: string;
  } | null;
}

export interface PaginatedLogs {
  data: LogEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface GetLogsParams {
  page?: number;
  limit?: number;
  tipo?: TipoLog;
  accion?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

export const getLogs = (params?: GetLogsParams) =>
  api.get<PaginatedLogs>("/logs", { params });

export const getLogById = (id: string) => api.get<LogEntity>(`/logs/${id}`);
