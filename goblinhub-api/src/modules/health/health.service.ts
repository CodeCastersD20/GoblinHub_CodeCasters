import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../../connect/prisma.service';

export const DEFAULT_DEPENDENCY_TIMEOUT_MS = 2000;

export type EstadoDependencia = 'up' | 'down';

export interface EstadoVerificacion {
  estado: EstadoDependencia;
  latenciaMs: number;
  detalle?: string;
}

export interface ReporteReadiness {
  estado: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  dependencias: {
    postgres: EstadoVerificacion;
    redis: EstadoVerificacion;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis?: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeoutMs: number = DEFAULT_DEPENDENCY_TIMEOUT_MS,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      this.logger.warn(
        'REDIS_URL no configurado: readiness lo reportará como down',
      );
    }
  }

  /**
   * Liveness: el proceso responde. No consulta dependencias para que un
   * problema externo no provoque un reinicio en bucle del contenedor.
   */
  liveness() {
    return {
      estado: 'ok' as const,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness: el proceso está listo para tráfico solo si PostgreSQL y Redis
   * responden dentro del presupuesto de tiempo. Devuelve 503 el controller.
   */
  async readiness(): Promise<ReporteReadiness> {
    const [postgres, redis] = await Promise.all([
      this.verificarPostgres(),
      this.verificarRedis(),
    ]);

    return {
      estado:
        postgres.estado === 'up' && redis.estado === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dependencias: { postgres, redis },
    };
  }

  private async verificarPostgres(): Promise<EstadoVerificacion> {
    return this.medir(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });
  }

  private async verificarRedis(): Promise<EstadoVerificacion> {
    if (!this.redis) {
      return {
        estado: 'down',
        latenciaMs: 0,
        detalle: 'REDIS_URL no configurado',
      };
    }

    return this.medir(async () => {
      const respuesta: string = await this.redis!.ping();
      if (respuesta !== 'PONG') {
        throw new Error(`respuesta inesperada de PING: ${respuesta}`);
      }
    });
  }

  private async medir(
    operacion: () => Promise<void>,
  ): Promise<EstadoVerificacion> {
    const inicio = Date.now();
    try {
      await this.conTimeout(operacion());
      return { estado: 'up', latenciaMs: Date.now() - inicio };
    } catch (error: unknown) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Dependencia no disponible: ${detalle}`);
      return { estado: 'down', latenciaMs: Date.now() - inicio, detalle };
    }
  }

  private conTimeout<T>(promesa: Promise<T>): Promise<T> {
    let temporizador: NodeJS.Timeout | undefined;
    const expiracion = new Promise<never>((_resolve, reject) => {
      temporizador = setTimeout(
        () => reject(new Error(`timeout tras ${this.timeoutMs} ms`)),
        this.timeoutMs,
      );
    });

    return Promise.race([promesa, expiracion]).finally(() => {
      if (temporizador) clearTimeout(temporizador);
    });
  }
}
