import type { DeployEnvironment } from '../constants/deploy-environment';

/**
 * Etiqueta constante que lleva toda métrica de la app (FR-006). Es lo que
 * permite que un único tablero distinga desarrollo, staging y producción: sin
 * ella, un pico de staging se lee como una caída de producción.
 */
export const ETIQUETA_ENTORNO = 'deployment_environment';

export const NOMBRES_METRICAS = {
  peticionesTotales: 'goblinhub_http_requests_total',
  duracionPeticion: 'goblinhub_http_request_duration_seconds',
  saludReadiness: 'goblinhub_health_ready',
  poolConexionesEnUso: 'goblinhub_prisma_pool_connections_in_use',
  poolConexionesMaximo: 'goblinhub_prisma_pool_connections_max',
  ultimoBackupExitoso: 'goblinhub_backup_last_success_timestamp_seconds',
} as const;

/**
 * Buckets del histograma de latencia. Cubre desde 25 ms hasta 10 s con la
 * precisión suficiente para separate P50/P95/P99 sobre la latencia medida en
 * `k6/` (3 ms en `GET /`, 51 ms en `/productos`, 110 ms en el peor caso de
 * autenticación) y con la cola larga que exige el SLA S3 de 1 s.
 */
export const BUCKETS_LATENCIA_SEGUNDOS = [
  0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

/** Rutas que no se instrumentan para no contaminar la propia métrica. */
export const RUTAS_EXCLUIDAS = ['/metrics'] as const;

export interface MetricSetOptions {
  entorno: DeployEnvironment;
  /** Fecha epoch en segundos del último respaldo exitoso (M-12). */
  ultimoBackupExitoso?: number;
  /** Conexiones del pool de Prisma en uso (M-11). */
  poolConexionesEnUso?: number;
  /** Máximo de conexiones del pool de Prisma (M-11). */
  poolConexionesMaximo?: number;
}

/**
 * Snapshot del registro de métricas, congelado para un entorno. Es la entidad
 * de dominio que consumen el caso de uso y el controlador, de modo que la
 * capa de interfaces no depende de `prom-client`.
 */
export interface MetricSet {
  entorno: DeployEnvironment;
  hayUltimoBackup: boolean;
  ultimoBackupExitoso: number | null;
  poolConexionesEnUso: number | null;
  poolConexionesMaximo: number | null;
}
