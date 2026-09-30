import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../connect/prisma.service';
import { LogAuditoria } from '../../domain/entities/log-auditoria.entity';
import type { TipoActor } from '../../domain/enums/tipo-actor.enum';
import type { ResultadoAuditoria } from '../../domain/enums/resultado-auditoria.enum';
import {
  type FiltrosAuditoria,
  LogAuditoriaRepository,
  type ListadoAuditoria,
  type PaginacionAuditoria,
  type RegistroAuditoria,
} from '../../domain/repositories/log-auditoria.repository';

/** Fila de `logs_auditoria` tal y como la devuelve Prisma. */
type FilaAuditoria = {
  id_auditoria: bigint;
  actor_tipo: string;
  actor_id: string | null;
  accion: string;
  recurso: string;
  resultado: string;
  correlation_id: string;
  fecha_hora: Date;
  usuario: {
    nombre: string;
    apellidos: string;
    rol: string;
  } | null;
};

/** Mismo formato que `PathNormalizerService`, para no repetir la expresión. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PrismaLogAuditoriaRepository extends LogAuditoriaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * La única escritura que existe sobre la tabla. No hay `update` ni `delete`
   * en esta clase ni en la interfaz: el registro se inserta y no se vuelve a
   * tocar.
   */
  async registrar(registro: RegistroAuditoria): Promise<void> {
    await this.prisma.logs_Auditoria.create({
      data: {
        actor_tipo: registro.actor_tipo,
        actor_id: registro.actor_id,
        accion: registro.accion,
        recurso: registro.recurso,
        resultado: registro.resultado,
        correlation_id: registro.correlation_id,
      },
    });
  }

  async listar(
    filtros: FiltrosAuditoria,
    paginacion: PaginacionAuditoria,
  ): Promise<ListadoAuditoria> {
    const where = this.aWhere(filtros);
    const saltar = (paginacion.page - 1) * paginacion.limit;

    const [filas, total] = await Promise.all([
      this.prisma.logs_Auditoria.findMany({
        where,
        orderBy: { fecha_hora: 'desc' },
        skip: saltar,
        take: paginacion.limit,
        include: {
          // El nombre no se guarda en la tabla de auditoría: se resuelve aquí,
          // en el momento de leer, para que el visor muestre una persona y no
          // un UUID sin que la tabla acabe conteniendo datos personales.
          usuario: { select: { nombre: true, apellidos: true, rol: true } },
        },
      }),
      // El `COUNT` en una tabla grande es la parte cara de la consulta, así que
      // solo se gasta cuando se ha pedido.
      paginacion.includeTotal
        ? this.prisma.logs_Auditoria.count({ where })
        : null,
    ]);

    return {
      registros: filas.map((fila) => this.aLogAuditoria(fila as FilaAuditoria)),
      total: total === null ? null : total,
    };
  }

  private aWhere(filtros: FiltrosAuditoria): Prisma.Logs_AuditoriaWhereInput {
    const where: Prisma.Logs_AuditoriaWhereInput = {};

    if (filtros.accion !== undefined) where.accion = filtros.accion;
    if (filtros.resultado !== undefined) where.resultado = filtros.resultado;

    // `recurso` es contenido y no igualdad: quien escribe `/events` quiere ver
    // `/events/:id` y `/events/:id/sesiones`, que es como se usa un visor.
    if (filtros.recurso !== undefined) {
      where.recurso = {
        contains: filtros.recurso,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (filtros.desde !== undefined || filtros.hasta !== undefined) {
      where.fecha_hora = {
        ...(filtros.desde !== undefined ? { gte: filtros.desde } : {}),
        ...(filtros.hasta !== undefined ? { lte: filtros.hasta } : {}),
      };
    }

    if (filtros.actor !== undefined) {
      where.OR = this.condicionesDeActor(filtros.actor);
    }

    return where;
  }

  /**
   * El filtro por actor acepta dos cosas a la vez: el UUID exacto y parte del
   * nombre o los apellidos.
   *
   * El UUID solo entra en el `where` si de verdad lo es. Comparar una columna
   * `Uuid` contra una cadena que no lo es no devuelve cero filas: Postgres
   * responde con un error de sintaxis y el visor acabaría con un 500 por algo
   * que es simplemente una búsqueda por nombre.
   */
  private condicionesDeActor(actor: string): Prisma.Logs_AuditoriaWhereInput[] {
    const condiciones: Prisma.Logs_AuditoriaWhereInput[] = [];

    if (UUID.test(actor)) {
      condiciones.push({ actor_id: { equals: actor } });
    }

    condiciones.push({
      usuario: {
        OR: [
          { nombre: { contains: actor, mode: Prisma.QueryMode.insensitive } },
          {
            apellidos: { contains: actor, mode: Prisma.QueryMode.insensitive },
          },
        ],
      },
    });

    return condiciones;
  }

  /**
   * `id_auditoria` es `BIGINT` y Prisma lo devuelve como `bigint`, que
   * `JSON.stringify` no sabe serializar. Se pasa a cadena en el borde, igual
   * que hace el repositorio de `logs_actividad`.
   */
  private aLogAuditoria(fila: FilaAuditoria): LogAuditoria {
    return new LogAuditoria(
      fila.id_auditoria.toString(),
      fila.actor_tipo as TipoActor,
      fila.actor_id,
      fila.accion,
      fila.recurso,
      fila.resultado as ResultadoAuditoria,
      fila.correlation_id,
      fila.fecha_hora,
      fila.usuario,
    );
  }
}
