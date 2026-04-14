import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';

interface TimeBucket {
  label: string;
  value: number;
}

interface DashboardSummary {
  totalUsuarios: number;
  totalProductos: number;
  usuariosActivos: number;
  eventosRealizados: number;
  eventosProximos: number;
  totalAsistencias: number;
  totalNovatos: number;
  tasaConversion: number | null;
  ocupacion: number | null;
}

interface TopUser {
  id_usuario: string;
  nombre: string;
  apellidos: string;
  eventosAsistidos: number;
  puntos: number;
  nivel: string;
}

export interface DashboardMetrics {
  summary: DashboardSummary;
  crecimientoUsuarios: TimeBucket[];
  crecimientoEventos: TimeBucket[];
  distribucionNiveles: TimeBucket[];
  eventosPorTipo: TimeBucket[];
  asistenciaPorMes: TimeBucket[];
  topUsuarios: TopUser[];
}

@Injectable()
export class GetDashboardMetricsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(months = 6): Promise<DashboardMetrics> {
    const safeMonths = Math.min(Math.max(months, 3), 12);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsuarios,
      totalProductos,
      usuariosActivos,
      eventosRealizados,
      eventosProximos,
      totalAsistencias,
      capacidadTotal,
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { deleted_at: null },
      }),
      this.prisma.producto.count({
        where: { deleted_at: null, activo: true },
      }),
      this.prisma.usuario.count({
        where: { activo: true, deleted_at: null },
      }),
      this.prisma.evento.count({
        where: { deleted_at: null },
      }),
      this.prisma.evento.count({
        where: { deleted_at: null, fecha: { gte: todayStart } },
      }),
      this.prisma.inscripcion.count({
        where: { deleted_at: null },
      }),
      this.prisma.evento.aggregate({
        where: { deleted_at: null },
        _sum: { cupo_maximo: true },
      }),
    ]);

    const [totalNovatos, novatosConvertidos] = await Promise.all([
      this.prisma.captacion_Novato.count({ where: { deleted_at: null } }),
      this.prisma.captacion_Novato.count({
        where: { deleted_at: null, es_recurrente: true },
      }),
    ]);

    const tasaConversion =
      totalNovatos > 0
        ? Number(((novatosConvertidos / totalNovatos) * 100).toFixed(1))
        : null;

    const totalCupos = capacidadTotal._sum.cupo_maximo ?? 0;
    const ocupacion =
      totalCupos > 0
        ? Number(((totalAsistencias / totalCupos) * 100).toFixed(1))
        : null;

    const [crecimientoUsuarios, crecimientoEventos, asistenciaPorMes] =
      await Promise.all([
        this.buildMonthlySeries('usuarios', safeMonths),
        this.buildMonthlySeries('eventos', safeMonths),
        this.buildMonthlySeries('inscripciones', safeMonths),
      ]);

    const [distribucionNiveles, eventosPorTipo, topUsuarios] =
      await Promise.all([
        this.getDistribucionNiveles(),
        this.getEventosPorTipo(),
        this.getTopUsuarios(10),
      ]);

    return {
      summary: {
        totalUsuarios,
        totalProductos,
        usuariosActivos,
        eventosRealizados,
        eventosProximos,
        totalAsistencias,
        totalNovatos,
        tasaConversion,
        ocupacion,
      },
      crecimientoUsuarios,
      crecimientoEventos,
      distribucionNiveles,
      eventosPorTipo,
      asistenciaPorMes,
      topUsuarios,
    };
  }

  private async buildMonthlySeries(
    entity: 'usuarios' | 'eventos' | 'inscripciones',
    months: number,
  ): Promise<TimeBucket[]> {
    const now = new Date();
    const buckets = Array.from({ length: months }, (_, i) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1 - i),
        1,
      );
      return {
        label: date.toLocaleDateString('es-CL', { month: 'short' }),
        start: date,
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      };
    });

    const firstMonthStart = buckets[0]?.start;
    if (!firstMonthStart) return [];

    const groupedCounts = await this.getMonthlyCounts(entity, firstMonthStart);

    return buckets.map(({ label, start }) => {
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      return {
        label,
        value: groupedCounts.get(key) ?? 0,
      };
    });
  }

  private async getMonthlyCounts(
    entity: 'usuarios' | 'eventos' | 'inscripciones',
    from: Date,
  ): Promise<Map<string, number>> {
    type MonthlyRow = { month: Date; count: bigint };

    let rows: MonthlyRow[] = [];

    if (entity === 'usuarios') {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::bigint AS count
        FROM usuarios
        WHERE deleted_at IS NULL
          AND created_at >= ${from}
        GROUP BY 1
      `;
    } else if (entity === 'eventos') {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::bigint AS count
        FROM eventos
        WHERE deleted_at IS NULL
          AND created_at >= ${from}
        GROUP BY 1
      `;
    } else {
      rows = await this.prisma.$queryRaw<MonthlyRow[]>`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::bigint AS count
        FROM inscripciones
        WHERE deleted_at IS NULL
          AND created_at >= ${from}
        GROUP BY 1
      `;
    }

    const result = new Map<string, number>();
    for (const row of rows) {
      const monthDate = new Date(row.month);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      result.set(key, Number(row.count));
    }

    return result;
  }

  private async getDistribucionNiveles(): Promise<TimeBucket[]> {
    const grouped = await this.prisma.usuario.groupBy({
      by: ['nivel_experiencia'],
      where: { deleted_at: null, activo: true },
      _count: { _all: true },
    });

    return grouped.map((row) => ({
      label: row.nivel_experiencia,
      value: row._count._all,
    }));
  }

  private async getEventosPorTipo(): Promise<TimeBucket[]> {
    const grouped = await this.prisma.evento.groupBy({
      by: ['tipo_evento'],
      where: { deleted_at: null },
      _count: { _all: true },
    });

    return grouped.map((row) => ({
      label: row.tipo_evento,
      value: row._count._all,
    }));
  }

  private async getTopUsuarios(limit: number): Promise<TopUser[]> {
    const grouped = await this.prisma.inscripcion.groupBy({
      by: ['id_usuario'],
      where: { deleted_at: null },
      _count: { id_usuario: true },
      orderBy: { _count: { id_usuario: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const users = await this.prisma.usuario.findMany({
      where: {
        id_usuario: { in: grouped.map((g) => g.id_usuario) },
        deleted_at: null,
      },
      select: {
        id_usuario: true,
        nombre: true,
        apellidos: true,
        puntos_fidelidad: true,
        nivel_experiencia: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id_usuario, u]));

    return grouped.map((row) => {
      const user = userMap.get(row.id_usuario);
      return {
        id_usuario: row.id_usuario,
        nombre: user?.nombre ?? '--',
        apellidos: user?.apellidos ?? '',
        eventosAsistidos: row._count.id_usuario,
        puntos: user?.puntos_fidelidad ?? 0,
        nivel: user?.nivel_experiencia ?? '--',
      };
    });
  }
}
