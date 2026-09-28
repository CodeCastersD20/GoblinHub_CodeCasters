import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import {
  FiltrosTrazas,
  ListadoTrazas,
  PaginacionTrazas,
  TrazaConSpans,
  TrazaRepository,
} from '../../domain/repositories/traza.repository';
import { Traza } from '../../domain/entities/traza.entity';
import { Span } from '../../domain/entities/span.entity';
import { EstadoSpan, TipoSpan } from '../../domain/enums/tipo-span.enum';
import type { NivelTraza } from '../../domain/enums/nivel-traza.enum';
import type { Json } from '../../domain/services/redaction.service';

/** Fila de `trazas` tal y como la devuelve Prisma. */
type FilaTraza = {
  id_traza: string;
  correlation_id: string;
  metodo: string;
  ruta: string;
  estado_http: number;
  duracion_ms: number;
  ambiente: string;
  servicio: string;
  nivel: string;
  id_usuario: string | null;
  error: string | null;
  fecha_inicio: Date;
  fecha_fin: Date;
};

type FilaSpan = {
  id_span: string;
  id_traza: string;
  parent_id: string | null;
  nombre: string;
  tipo: string;
  duracion_ms: number;
  estado: string;
  atributos: unknown;
  fecha_inicio: Date;
};

@Injectable()
export class TrazaRepositoryPrisma extends TrazaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Traza y spans se escriben en la misma transacción: un span sin traza no
   * significa nada, y la base de datos lo impediría con la foreign key, pero
   * quedaría un registro a medias en `trazas` que el visor mostraría como una
   * petición sin pasos.
   */
  async guardar(traza: Traza, spans: Span[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.traza.create({
        data: {
          id_traza: traza.id_traza,
          correlation_id: traza.correlation_id,
          metodo: traza.metodo,
          ruta: traza.ruta,
          estado_http: traza.estado_http,
          duracion_ms: traza.duracion_ms,
          ambiente: traza.ambiente,
          servicio: traza.servicio,
          nivel: traza.nivel,
          id_usuario: traza.id_usuario ?? null,
          error: traza.error ?? null,
          fecha_inicio: traza.fecha_inicio,
          fecha_fin: traza.fecha_fin,
        },
      });

      if (spans.length === 0) {
        return;
      }

      await tx.span.createMany({
        data: spans.map((span) => ({
          id_span: span.id_span,
          id_traza: span.id_traza,
          parent_id: span.parent_id ?? null,
          nombre: span.nombre,
          tipo: span.tipo,
          duracion_ms: span.duracion_ms,
          estado: span.estado,
          atributos: span.atributos ?? undefined,
          fecha_inicio: span.fecha_inicio,
        })),
      });
    });
  }

  /**
   * El orden descendente se aplica en la consulta y no en el índice: añadir
   * `sort: Desc` obligaría a `partialIndexes` en el generador de Prisma, que es
   * un cambio de configuración de todo el proyecto (ver *Índices* en
   * `data-model.md`).
   */
  async listar(
    filtros: FiltrosTrazas,
    paginacion: PaginacionTrazas,
  ): Promise<ListadoTrazas> {
    const where = this.aWhere(filtros);
    const saltar = (paginacion.page - 1) * paginacion.limit;

    const [filas, total] = await Promise.all([
      this.prisma.traza.findMany({
        where,
        orderBy: { fecha_inicio: 'desc' },
        skip: saltar,
        take: paginacion.limit,
      }),
      // El `COUNT` en una tabla grande es la parte cara de la consulta, así que
      // solo se gasta cuando se ha pedido. `Promise.all` y no dos awaits
      // seguidos porque son independientes y así viajan en paralelo.
      paginacion.includeTotal ? this.prisma.traza.count({ where }) : null,
    ]);

    return {
      trazas: filas.map((fila) => this.aTraza(fila as FilaTraza)),
      total: total === null ? null : total,
    };
  }

  async obtenerPorCorrelationId(
    correlationId: string,
  ): Promise<TrazaConSpans | null> {
    const fila = await this.prisma.traza.findUnique({
      where: { correlation_id: correlationId },
      include: { spans: true },
    });

    if (!fila) {
      return null;
    }

    const conSpans = fila as FilaTraza & { spans: FilaSpan[] };

    return {
      traza: this.aTraza(conSpans),
      // Sin `orderBy`: el visor conserva el orden de llegada y no lo reordena, y
      // los hermanos en el árbol se muestran en la secuencia en que se
      // ejecutaron, que es lo que hace legible la historia.
      spans: conSpans.spans.map((span) => this.aSpan(span)),
    };
  }

  /**
   * `deleteMany` y no un `findMany` seguido de borrados uno a uno: son dos viajes
   * a la base de datos en lugar de uno, y el recuento sale del propio `DELETE`.
   * Los spans se van en cascada por la foreign key de `spans`, así que no hace
   * falta pedirlos.
   */
  async purgarVencidas(anteriorA: Date): Promise<{ count: number }> {
    const { count } = await this.prisma.traza.deleteMany({
      where: { fecha_inicio: { lt: anteriorA } },
    });

    return { count };
  }

  private aWhere(filtros: FiltrosTrazas): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filtros.servicio !== undefined) where.servicio = filtros.servicio;
    if (filtros.metodo !== undefined) where.metodo = filtros.metodo;
    if (filtros.ambiente !== undefined) where.ambiente = filtros.ambiente;
    if (filtros.estado !== undefined) where.estado_http = filtros.estado;

    // `ruta` es prefijo y no igualdad: se busca `/events` y debe devolver
    // `/events/:id` y `/events/:id/sesiones`. Sin esto el filtro solo serviría
    // para consultas exactas, que es justo lo que un visor no necesita.
    if (filtros.ruta !== undefined) {
      where.ruta = { startsWith: filtros.ruta };
    }

    if (filtros.desde !== undefined || filtros.hasta !== undefined) {
      where.fecha_inicio = {
        ...(filtros.desde !== undefined ? { gte: filtros.desde } : {}),
        ...(filtros.hasta !== undefined ? { lte: filtros.hasta } : {}),
      };
    }

    return where;
  }

  /**
   * Los tipos de las columnas `tipo` y `estado` son `VarChar` en la base de
   * datos, no enums de Prisma, así que llegan como `string`. Se castean al enum
   * de dominio para que el resto del visor no tenga que comparar contra
   * literales sueltos por todas partes.
   */
  private aSpan(fila: FilaSpan): Span {
    return new Span(
      fila.id_span,
      fila.id_traza,
      fila.nombre,
      fila.tipo as TipoSpan,
      fila.duracion_ms,
      fila.estado as EstadoSpan,
      fila.fecha_inicio,
      fila.parent_id,
      (fila.atributos as Json | null) ?? null,
    );
  }

  private aTraza(fila: FilaTraza): Traza {
    return new Traza(
      fila.id_traza,
      fila.correlation_id,
      fila.metodo,
      fila.ruta,
      fila.estado_http,
      fila.duracion_ms,
      fila.ambiente,
      fila.fecha_inicio,
      fila.fecha_fin,
      fila.id_usuario,
      fila.error,
      (fila.nivel as NivelTraza) ?? 'info',
      fila.servicio,
    );
  }
}
