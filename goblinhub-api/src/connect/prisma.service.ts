import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export const DEFAULT_POOL_MAX = 10;

export interface PoolStats {
  enUso: number;
  maximo: number;
}

/**
 * Cliente de Prisma sobre un pool de `pg` creado explícitamente.
 *
 * El pool se instancia aquí, y no dentro del adaptador, por un motivo
 * observable: `pg` no expone contadores de conexiones a través del adaptador, y
 * sin ellos no hay forma de publicar M-11 (`goblinhub_prisma_pool_connections_*`)
 * ni de alertar cuando se acerca al límite de Supabase. `Pool` no abre
 * conexiones hasta la primera consulta, así que construirlo no altera el
 * arranque de la aplicación.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? DEFAULT_POOL_MAX),
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Conexiones ocupadas y máximo configurado, para la métrica M-11. */
  get poolStats(): PoolStats {
    return {
      enUso: this.pool.totalCount - this.pool.idleCount,
      maximo: this.pool.options.max ?? DEFAULT_POOL_MAX,
    };
  }
}
