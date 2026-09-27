import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import { resolveDeployEnvironment } from '../../domain/constants/deploy-environment';
import type { DeployEnvironment } from '../../domain/constants/deploy-environment';
import {
  BUCKETS_LATENCIA_SEGUNDOS,
  ETIQUETA_ENTORNO,
  NOMBRES_METRICAS,
} from '../../domain/entities/metric-set.entity';
import type { MetricSet } from '../../domain/entities/metric-set.entity';

/**
 * Registro de métricas de la API (FR-001 a FR-006).
 *
 * Usa una instancia propia de `Registry` en lugar del registro global de
 * `prom-client` por dos motivos: los tests pueden instanciar el servicio sin
 * contaminar el registro global entre casos, y las etiquetas constantes quedan
 * garantizadas en **todas** las métricas, incluidas las de
 * `collectDefaultMetrics()` (M-08, M-09, M-10).
 */
@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry = new Registry();
  private readonly entorno: DeployEnvironment;
  private readonly peticionesTotales: Counter<'method' | 'route' | 'status'>;
  private readonly duracionPeticion: Histogram<'method' | 'route' | 'status'>;
  private readonly saludReadiness: Gauge<string>;
  private readonly poolConexionesEnUso: Gauge<string>;
  private readonly poolConexionesMaximo: Gauge<string>;
  private readonly ultimoBackupExitoso: Gauge<string>;
  private ultimoBackupEpoch: number | null = null;
  private poolEnUso: number | null = null;
  private poolMaximo: number | null = null;
  private started = false;

  constructor() {
    this.entorno = resolveDeployEnvironment();
    this.registry.setDefaultLabels({ [ETIQUETA_ENTORNO]: this.entorno });

    this.peticionesTotales = new Counter({
      name: NOMBRES_METRICAS.peticionesTotales,
      help: 'Total de peticiones HTTP atendidas por la API',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [this.registry],
    });

    this.duracionPeticion = new Histogram({
      name: NOMBRES_METRICAS.duracionPeticion,
      help: 'Duración de las peticiones HTTP en segundos',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: BUCKETS_LATENCIA_SEGUNDOS,
      registers: [this.registry],
    });

    this.saludReadiness = new Gauge({
      name: NOMBRES_METRICAS.saludReadiness,
      help: 'Resultado de la sonda de readiness: 1 si PostgreSQL y Redis responden, 0 si no',
      registers: [this.registry],
    });

    this.poolConexionesEnUso = new Gauge({
      name: NOMBRES_METRICAS.poolConexionesEnUso,
      help: 'Conexiones del pool de PostgreSQL en uso',
      registers: [this.registry],
    });

    this.poolConexionesMaximo = new Gauge({
      name: NOMBRES_METRICAS.poolConexionesMaximo,
      help: 'Máximo de conexiones configurado en el pool de PostgreSQL',
      registers: [this.registry],
    });

    this.ultimoBackupExitoso = new Gauge({
      name: NOMBRES_METRICAS.ultimoBackupExitoso,
      help: 'Fecha epoch en segundos del último respaldo de base de datos exitoso',
      registers: [this.registry],
    });
  }

  /** Registra CPU, memoria y event loop lag de Node (FR-004). */
  onModuleInit(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    collectDefaultMetrics({ register: this.registry });
    this.logger.log(
      `Métricas registradas con la etiqueta ${ETIQUETA_ENTORNO}="${this.entorno}"`,
    );
  }

  onModuleDestroy(): void {
    this.registry.clear();
    this.started = false;
  }

  entornoActual(): DeployEnvironment {
    return this.entorno;
  }

  registrarPeticion(
    method: string,
    route: string,
    status: number,
    duracionSegundos: number,
  ): void {
    const etiquetas = {
      method,
      route,
      status: String(status),
    };
    this.peticionesTotales.inc(etiquetas);
    this.duracionPeticion.observe(etiquetas, duracionSegundos);
  }

  registrarResultadoReadiness(estado: 'ok' | 'degraded'): void {
    this.saludReadiness.set(estado === 'ok' ? 1 : 0);
  }

  registrarPoolConexiones(enUso: number, maximo: number): void {
    this.poolEnUso = enUso;
    this.poolMaximo = maximo;
    this.poolConexionesEnUso.set(enUso);
    this.poolConexionesMaximo.set(maximo);
  }

  /** Lo invoca `BackupService` al completar un respaldo (M-12). */
  registrarBackupExitoso(momento?: Date): void {
    const instante = momento ?? new Date();
    this.ultimoBackupEpoch = Math.floor(instante.getTime() / 1000);
    this.ultimoBackupExitoso.set(this.ultimoBackupEpoch);
  }

  metricSet(): MetricSet {
    return {
      entorno: this.entorno,
      hayUltimoBackup: this.ultimoBackupEpoch !== null,
      ultimoBackupExitoso: this.ultimoBackupEpoch,
      poolConexionesEnUso: this.poolEnUso,
      poolConexionesMaximo: this.poolMaximo,
    };
  }

  /** Cuerpo de `GET /metrics` en formato de exposición de Prometheus. */
  async exposition(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
