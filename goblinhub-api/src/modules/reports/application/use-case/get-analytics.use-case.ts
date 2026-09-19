import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../connect/prisma.service';
import {
  Analytics,
  AsistenciaMensual,
  CrecimientoMensual,
  DistribucionNivel,
  EventosPorTipo,
  TopUsuario,
} from '../../domain/entities/analytics.entity';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface MonthBucket {
  start: Date;
  end: Date;
}

@Injectable()
export class GetAnalyticsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(desde?: string, hasta?: string): Promise<Analytics> {
    const desdeDate = this.parseDate('desde', desde, true);
    const hastaDate = this.parseDate('hasta', hasta, false);

    if (desdeDate && hastaDate && desdeDate > hastaDate) {
      throw new BadRequestException(
        "El parámetro 'desde' no puede ser posterior a 'hasta'",
      );
    }

    const createdFilter = this.buildDateFilter(desdeDate, hastaDate);
    const fechaFilter = this.buildDateFilter(desdeDate, hastaDate);

    const [usuariosActivos, eventosRealizados, totalAsistencias, totalEnRango] =
      await Promise.all([
        this.prisma.usuario.count({
          where: {
            activo: true,
            deleted_at: null,
            ...this.applyIf(createdFilter, 'created_at'),
          },
        }),
        this.prisma.evento.count({
          where: {
            deleted_at: null,
            ...this.applyIf(fechaFilter, 'fecha'),
          },
        }),
        this.prisma.inscripcion.count({
          where: {
            asistio: true,
            deleted_at: null,
            ...this.applyIf(createdFilter, 'created_at'),
          },
        }),
        this.prisma.inscripcion.count({
          where: {
            deleted_at: null,
            ...this.applyIf(createdFilter, 'created_at'),
          },
        }),
      ]);

    const tasaConversion =
      totalEnRango > 0
        ? Math.round((totalAsistencias / totalEnRango) * 100)
        : 0;

    const [
      crecimientoMensual,
      distribucionNivel,
      eventosPorTipo,
      asistenciaMensual,
      topUsuarios,
    ] = await Promise.all([
      this.getCrecimientoMensual(desdeDate, hastaDate),
      this.getDistribucionNivel(),
      this.getEventosPorTipo(fechaFilter),
      this.getAsistenciaMensual(desdeDate, hastaDate),
      this.getTopUsuarios(createdFilter),
    ]);

    return {
      usuariosActivos,
      eventosRealizados,
      totalAsistencias,
      tasaConversion,
      crecimientoMensual,
      distribucionNivel,
      eventosPorTipo,
      asistenciaMensual,
      topUsuarios,
    };
  }

  private parseDate(
    field: string,
    value?: string,
    startOfDay = true,
  ): Date | undefined {
    if (!value) return undefined;
    if (!DATE_REGEX.test(value) || Number.isNaN(Date.parse(value))) {
      throw new BadRequestException(
        `El parámetro '${field}' debe tener formato YYYY-MM-DD`,
      );
    }
    return startOfDay
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(`${value}T23:59:59.999Z`);
  }

  private buildDateFilter(desde?: Date, hasta?: Date): Prisma.DateTimeFilter {
    const filter: Prisma.DateTimeFilter = {};
    if (desde) filter.gte = desde;
    if (hasta) filter.lte = hasta;
    return filter;
  }

  private applyIf(
    filter: Prisma.DateTimeFilter,
    field: 'created_at' | 'fecha',
  ): Record<string, Prisma.DateTimeFilter> {
    return Object.keys(filter).length > 0 ? { [field]: filter } : {};
  }

  private async getCrecimientoMensual(
    desde?: Date,
    hasta?: Date,
  ): Promise<CrecimientoMensual[]> {
    const buckets = this.buildMonthBuckets(desde, hasta);
    if (buckets.length === 0) return [];

    const from = buckets[0].start;
    const toExclusive = buckets[buckets.length - 1].end;

    const [usuarios, eventos] = await Promise.all([
      this.countByMonth('usuarios', from, toExclusive),
      this.countByMonth('eventos', from, toExclusive),
    ]);

    return buckets.map(({ start }) => {
      const key = this.monthKey(start);
      return {
        mes: start.toLocaleDateString('es-ES', {
          month: 'long',
          timeZone: 'UTC',
        }),
        usuarios: usuarios.get(key) ?? 0,
        eventos: eventos.get(key) ?? 0,
      };
    });
  }

  private async getAsistenciaMensual(
    desde?: Date,
    hasta?: Date,
  ): Promise<AsistenciaMensual[]> {
    const buckets = this.buildMonthBuckets(desde, hasta);
    if (buckets.length === 0) return [];

    const rows = await this.countByMonth(
      'inscripciones',
      buckets[0].start,
      buckets[buckets.length - 1].end,
    );

    return buckets.map(({ start }) => ({
      mes: start.toLocaleDateString('es-ES', {
        month: 'short',
        timeZone: 'UTC',
      }),
      asistentes: rows.get(this.monthKey(start)) ?? 0,
    }));
  }

  private buildMonthBuckets(desde?: Date, hasta?: Date): MonthBucket[] {
    if (desde || hasta) {
      const startMonth = desde
        ? new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1))
        : new Date(Date.UTC(1970, 0, 1));
      const endMonth = hasta
        ? new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1))
        : new Date();

      const buckets: MonthBucket[] = [];
      const cursor = new Date(startMonth);
      while (cursor <= endMonth) {
        buckets.push({
          start: new Date(cursor),
          end: new Date(
            Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
          ),
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return buckets;
    }

    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1),
      );
      return {
        start,
        end: new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
        ),
      };
    });
  }

  private monthKey(start: Date): string {
    return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async countByMonth(
    entity: 'usuarios' | 'eventos' | 'inscripciones',
    from: Date,
    toExclusive: Date,
  ): Promise<Map<string, number>> {
    type MonthlyRow = { month: Date; count: bigint };

    let rows: MonthlyRow[];
    if (entity === 'usuarios') {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::bigint AS count
        FROM usuarios
        WHERE deleted_at IS NULL
          AND created_at >= ${from}
          AND created_at < ${toExclusive}
        GROUP BY 1
      `;
    } else if (entity === 'eventos') {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', fecha)::date AS month,
               COUNT(*)::bigint AS count
        FROM eventos
        WHERE deleted_at IS NULL
          AND fecha >= ${from}
          AND fecha < ${toExclusive}
        GROUP BY 1
      `;
    } else {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::bigint AS count
        FROM inscripciones
        WHERE deleted_at IS NULL
          AND asistio = true
          AND created_at >= ${from}
          AND created_at < ${toExclusive}
        GROUP BY 1
      `;
    }

    const map = new Map<string, number>();
    for (const row of rows) {
      const month = new Date(row.month);
      const key = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
      map.set(key, Number(row.count));
    }
    return map;
  }

  private async getDistribucionNivel(): Promise<DistribucionNivel> {
    const grouped = await this.prisma.usuario.groupBy({
      by: ['nivel_experiencia'],
      where: { activo: true, deleted_at: null },
      _count: { _all: true },
    });

    const result: DistribucionNivel = {
      novato: 0,
      intermedio: 0,
      veterano: 0,
    };

    for (const group of grouped) {
      result[group.nivel_experiencia] = group._count._all;
    }
    return result;
  }

  private async getEventosPorTipo(
    fechaFilter: Prisma.DateTimeFilter,
  ): Promise<EventosPorTipo[]> {
    const grouped = await this.prisma.evento.groupBy({
      by: ['tipo_evento'],
      where: {
        deleted_at: null,
        ...this.applyIf(fechaFilter, 'fecha'),
      },
      _count: { _all: true },
    });

    return grouped.map((row) => ({
      tipo: row.tipo_evento,
      cantidad: row._count._all,
    }));
  }

  private async getTopUsuarios(
    createdFilter: Prisma.DateTimeFilter,
  ): Promise<TopUsuario[]> {
    const topUsuarios = await this.prisma.usuario.findMany({
      where: { deleted_at: null },
      orderBy: { puntos_fidelidad: 'desc' },
      take: 10,
      select: {
        id_usuario: true,
        nombre: true,
        apellidos: true,
        puntos_fidelidad: true,
        nivel_experiencia: true,
      },
    });

    if (topUsuarios.length === 0) return [];

    const asistencias = await this.prisma.inscripcion.groupBy({
      by: ['id_usuario'],
      where: {
        id_usuario: { in: topUsuarios.map((u) => u.id_usuario) },
        asistio: true,
        deleted_at: null,
        ...this.applyIf(createdFilter, 'created_at'),
      },
      _count: { _all: true },
    });

    const asistenciasPorUsuario = new Map(
      asistencias.map((row) => [row.id_usuario, row._count._all]),
    );

    return topUsuarios.map((user) => ({
      nombre: user.nombre,
      apellidos: user.apellidos,
      eventosAsistidos: asistenciasPorUsuario.get(user.id_usuario) ?? 0,
      puntos_fidelidad: user.puntos_fidelidad,
      nivel_experiencia: user.nivel_experiencia,
    }));
  }
}
