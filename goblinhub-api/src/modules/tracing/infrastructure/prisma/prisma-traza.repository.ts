import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import { TrazaRepository } from '../../domain/repositories/traza.repository';
import { Traza } from '../../domain/entities/traza.entity';
import { Span } from '../../domain/entities/span.entity';

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
}
