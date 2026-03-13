import { LogEntity, TipoLog } from '../entities/log.entity';

// Parámetros de búsqueda opcionales
export interface LogFilters {
  tipo?: TipoLog;
  accion?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

// Respuesta paginada
export interface PaginatedLogs {
  data: LogEntity[];
  total: number;
  page: number;
  limit: number;
}

// Un token único para inyectar este repositorio en NestJS
export const LOG_REPOSITORY = Symbol('LOG_REPOSITORY');

export interface ILogRepository {
  findAll(filters: LogFilters): Promise<PaginatedLogs>;
  findById(id: string): Promise<LogEntity | null>;
  create(log: Omit<LogEntity, 'id_log' | 'fecha_hora'>): Promise<void>;
}
