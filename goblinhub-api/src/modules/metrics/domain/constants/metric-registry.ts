/**
 * Catálogo de métricas técnicas (M-01…M-15) de
 * `specs/005-modulo-metricas-monitoreo/plan.md` §2.
 *
 * Cada entrada declara nombre de métrica, tipo, unidad, umbrales preventivo y
 * crítico, fuente y acción, como exige el criterio de aceptación de #210. Los
 * nombres son la contrato compartido entre el backend (registro Prometheus), las
 * reglas de alerta y el tablero: si cambia aquí, cambia en los tres sitios.
 */

export type MetricaTipo = 'contador' | 'histograma' | 'medidor' | 'derivada';

export interface MetricaRegistrada {
  /** Identificador del catálogo, p. ej. `M-04`. */
  id: string;
  /** Nombre completo de la métrica en formato Prometheus. */
  nombre: string;
  tipo: MetricaTipo;
  unidad: string;
  /** Umbral de la alerta preventiva (`severity: warning`). */
  umbralPreventivo: string;
  /** Umbral de la alerta crítica (`severity: critical`). */
  umbralCritico: string;
  /** De dónde sale el valor: registro de la app, scrape o `node_exporter`. */
  fuente: string;
  /** Qué hacer cuando se supera el umbral. */
  accion: string;
  /** `true` si la emite el backend; `false` si la calcula Prometheus o un exportador. */
  instrumentadaPorBackend: boolean;
}

export const PREFIJO_METRICAS = 'goblinhub';

export const CATALOGO_METRICAS_TECNICAS: readonly MetricaRegistrada[] = [
  {
    id: 'M-01',
    nombre: 'up',
    tipo: 'medidor',
    unidad: '0/1',
    umbralPreventivo: '—',
    umbralCritico: '== 0 durante 2 min',
    fuente: 'Scrape de Prometheus sobre /metrics',
    accion:
      'Crítica: revisar logs de Render; si es un despliegue, revertir al commit anterior; si es la BD, diagnosticar la conexión',
    instrumentadaPorBackend: false,
  },
  {
    id: 'M-02',
    nombre: 'avg_over_time(up[30d])',
    tipo: 'derivada',
    unidad: '%',
    umbralPreventivo: '< 99,5 %',
    umbralCritico: '< 99 %',
    fuente: 'Recording rule sobre up',
    accion:
      'Preventiva: revisar incidentes del mes (SLA S1 de docs/SLA_METRICAS_Y_PARAMETROS.md)',
    instrumentadaPorBackend: false,
  },
  {
    id: 'M-03',
    nombre: 'goblinhub_http_request_duration_seconds (P50)',
    tipo: 'histograma',
    unidad: 's',
    umbralPreventivo: '—',
    umbralCritico: '—',
    fuente: 'Interceptor de métricas de la API',
    accion: 'Línea base del tablero; sin alerta propia',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-04',
    nombre: 'goblinhub_http_request_duration_seconds (P95)',
    tipo: 'histograma',
    unidad: 's',
    umbralPreventivo: '> 0,5 s (producción) / > 1 s (staging)',
    umbralCritico: '> 1 s (producción) / > 2,5 s (staging)',
    fuente: 'Histograma de peticiones (M-03)',
    accion:
      'Localizar la ruta más lenta en el tablero; si es un agregado, aplicar caché en Redis',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-05',
    nombre: 'goblinhub_http_request_duration_seconds (P99)',
    tipo: 'histograma',
    unidad: 's',
    umbralPreventivo: '> 3 s (producción) / > 3 s (staging)',
    umbralCritico: '> 5 s (producción) / > 5 s (staging)',
    fuente: 'Histograma de peticiones (M-03)',
    accion: 'Complementa P95 para detectar colas largas',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-06',
    nombre: 'goblinhub_http_requests_total{status=~"5.."}',
    tipo: 'contador',
    unidad: 'ratio 0–1',
    umbralPreventivo: '> 0,5 % (producción) / > 1 % (staging)',
    umbralCritico: '> 5 % (producción) o > 20 % en 1 min',
    fuente: 'Contador de peticiones etiquetado por status',
    accion:
      'Filtrar por route en el tablero; si afecta a /auth, revisar Supabase Auth',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-07',
    nombre: 'rate(goblinhub_http_requests_total[5m])',
    tipo: 'derivada',
    unidad: 'req/s',
    umbralPreventivo: '< 0,1 req/s en 15 min (informativa)',
    umbralCritico: '—',
    fuente: 'Contador de peticiones (M-06)',
    accion:
      'Línea base de demanda; informativa hasta que exista calendario de tráfico por franja',
    instrumentadaPorBackend: false,
  },
  {
    id: 'M-08',
    nombre: 'process_resident_memory_bytes',
    tipo: 'medidor',
    unidad: 'bytes',
    umbralPreventivo: '> 419 430 400 (400 MiB) por 10 min',
    umbralCritico: '> 629 145 600 (600 MiB) por 5 min',
    fuente: 'collectDefaultMetrics() de prom-client',
    accion:
      'Comparar con la tendencia; si crece monótonamente es una fuga; si es por sharp en uploads, limitar concurrencia',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-09',
    nombre: 'rate(process_cpu_seconds_total[5m])',
    tipo: 'derivada',
    unidad: 'núcleos',
    umbralPreventivo: '> 0,85 por 15 min',
    umbralCritico: '> 1,5 por 5 min',
    fuente: 'collectDefaultMetrics() de prom-client',
    accion: 'Revisar throttling o consultas N+1 en la ruta más lenta',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-10',
    nombre: 'nodejs_eventloop_lag_seconds (P95)',
    tipo: 'histograma',
    unidad: 's',
    umbralPreventivo: '> 0,2 por 10 min',
    umbralCritico: '> 0,5 por 5 min',
    fuente: 'collectDefaultMetrics() de prom-client',
    accion:
      'El cron de backup y el de expiraciones compiten con el tráfico; mover a worker con lock distribuido',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-11',
    nombre: 'goblinhub_prisma_pool_connections_in_use',
    tipo: 'medidor',
    unidad: 'conexiones',
    umbralPreventivo: '> 80 % del máximo por 10 min',
    umbralCritico: '> 95 % por 5 min',
    fuente: 'Pool de pg exponido por PrismaService',
    accion: 'Reducir connection_limit o activar PgBouncer en Supabase',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-12',
    nombre: 'goblinhub_backup_last_success_timestamp_seconds',
    tipo: 'medidor',
    unidad: 'epoch (s)',
    umbralPreventivo: '> 90 000 s (25 h)',
    umbralCritico: '> 172 800 s (48 h)',
    fuente: 'BackupService al completar un respaldo',
    accion:
      'Ejecutar el respaldo manual y revisar pg_dump; el RPO acordado es de 24 h (S6)',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-13',
    nombre: 'goblinhub_health_ready',
    tipo: 'medidor',
    unidad: '0/1',
    umbralPreventivo: '—',
    umbralCritico: '== 0 durante 2 min',
    fuente: 'Sonda periódica de HealthService.readiness()',
    accion:
      'Proceso vivo sin dependencias: NO reiniciar en cascada; diagnosticar PostgreSQL o Redis',
    instrumentadaPorBackend: true,
  },
  {
    id: 'M-14',
    nombre: 'prometheus_config_last_reload_successful',
    tipo: 'medidor',
    unidad: '0/1',
    umbralPreventivo: '—',
    umbralCritico: '== 0',
    fuente: 'El propio Prometheus',
    accion:
      'El monitoreo se auto-mide: evita alertas mudas por config inválida',
    instrumentadaPorBackend: false,
  },
  {
    id: 'M-15',
    nombre: 'node_filesystem_avail_bytes',
    tipo: 'medidor',
    unidad: '%',
    umbralPreventivo: '> 80 % de uso',
    umbralCritico: '> 90 % de uso',
    fuente: 'node_exporter sobre el volumen de Prometheus',
    accion:
      'Sin espacio Prometheus deja de escribir y todas las alertas se apagan; reducir retención o expandir volumen',
    instrumentadaPorBackend: false,
  },
];

export function metricasDeBackend(): readonly MetricaRegistrada[] {
  return CATALOGO_METRICAS_TECNICAS.filter(
    (metrica) => metrica.instrumentadaPorBackend,
  );
}
