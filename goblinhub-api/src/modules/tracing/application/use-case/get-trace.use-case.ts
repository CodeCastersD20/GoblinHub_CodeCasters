import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Span } from '../../domain/entities/span.entity';
import { Traza } from '../../domain/entities/traza.entity';
import {
  TRAZA_REPOSITORY,
  TrazaRepository,
} from '../../domain/repositories/traza.repository';
import type { Json } from '../../domain/services/redaction.service';
import type { EstadoSpan, TipoSpan } from '../../domain/enums/tipo-span.enum';

/**
 * Un paso con sus hijos ya colgando. `parent_id` se conserva además de la
 * jerarquía porque el visor lo usa para el enlace directo a un paso y para
 * colorear el nivel; quitarlo obligaría al frontend a recorrer el árbol para
 * saber de dónde viene cada nodo.
 */
export type NodoSpan = {
  id_span: string;
  parent_id: string | null;
  nombre: string;
  tipo: TipoSpan;
  duracion_ms: number;
  estado: EstadoSpan;
  atributos: Json | null;
  fecha_inicio: Date;
  hijos: NodoSpan[];
};

export type DetalleTraza = {
  traza: Traza;
  pasos: NodoSpan[];
};

@Injectable()
export class GetTraceUseCase {
  constructor(
    @Inject(TRAZA_REPOSITORY)
    private readonly trazaRepository: TrazaRepository,
  ) {}

  async execute(correlationId: string): Promise<DetalleTraza> {
    const encontrado =
      await this.trazaRepository.obtenerPorCorrelationId(correlationId);

    if (!encontrado) {
      throw new NotFoundException(
        `No existe ninguna traza con la correlación ${correlationId}`,
      );
    }

    return {
      traza: encontrado.traza,
      pasos: this.aArbol(encontrado.spans),
    };
  }

  /**
   * Reconstruye la jerarquía en memoria a partir de una lista plana.
   *
   * Se indexan primero los hijos por padre y después se encolan las raíces, en
   * vez de buscar el padre de cada paso entre todos los demás: el árbol tiene
   * pocos niveles pero muchos pasos, y el método directo saldría en O(n²), que
   * es justo lo que pasa con una traza de una consulta con muchas subconsultas.
   */
  private aArbol(spans: Span[]): NodoSpan[] {
    const porId = new Map<string, NodoSpan>();
    const hijosPorPadre = new Map<string, NodoSpan[]>();

    for (const span of spans) {
      const nodo: NodoSpan = {
        id_span: span.id_span,
        parent_id: span.parent_id ?? null,
        nombre: span.nombre,
        tipo: span.tipo,
        duracion_ms: span.duracion_ms,
        estado: span.estado,
        atributos: span.atributos ?? null,
        fecha_inicio: span.fecha_inicio,
        hijos: [],
      };

      porId.set(nodo.id_span, nodo);
    }

    for (const span of spans) {
      const nodo = porId.get(span.id_span);

      if (!nodo) {
        continue;
      }

      const padre = span.parent_id ? porId.get(span.parent_id) : undefined;

      // Un padre que no está en la misma traza deja al paso sin sitio en el
      // árbol. Se cuelga de la raíz en lugar de descartarlo: `data-model.md` lo
      // considera inválido pero tratarlo como raíz, y perderlo dejaría el
      // diagnóstico incompleto justo en la traza que más falta hace.
      if (span.parent_id && !padre) {
        nodo.parent_id = null;
        continue;
      }

      if (padre) {
        const hermanos = hijosPorPadre.get(padre.id_span) ?? [];
        hermanos.push(nodo);
        hijosPorPadre.set(padre.id_span, hermanos);
      }
    }

    const raices = spans
      .filter((span) => !span.parent_id || !porId.has(span.parent_id))
      .map((span) => porId.get(span.id_span))
      .filter((nodo): nodo is NodoSpan => nodo !== undefined);

    // Segundo recorrido para enganchar los hijos ya agrupados: hacerlo aquí y
    // no en el bucle anterior permite que un hijo aparezca antes que su padre en
    // la lista, que es justo lo que devuelve la base de datos sin `ORDER BY`.
    for (const [idPadre, hijos] of hijosPorPadre) {
      const padre = porId.get(idPadre);
      if (padre) {
        padre.hijos = hijos;
      }
    }

    return raices;
  }
}
