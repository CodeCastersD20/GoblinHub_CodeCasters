import { randomUUID } from 'node:crypto';
import { EstadoSpan, TipoSpan } from '../enums/tipo-span.enum';
import type { Span } from '../entities/span.entity';
import type { Json } from './redaction.service';
import type { Reloj } from './reloj';

type SpanAbierto = {
  id: string;
  parentId: string | null;
  nombre: string;
  tipo: TipoSpan;
  inicio: number;
  fechaInicio: Date;
};

/**
 * Reúne los pasos internos de una petición mientras se ejecuta.
 *
 * Vive mientras dura la petición y se entrega ya cerrado al repositorio. Solo
 * guarda los spans que se han cerrado: uno que se quedó a medias no tiene
 * duración real, y medirlo con el momento en que debería haber terminado daría
 * un número engañoso en el visor.
 */
export class SpanCollector {
  private readonly abiertos = new Map<string, SpanAbierto>();
  private readonly spansCerrados: Span[] = [];

  constructor(
    private readonly trazaId: string,
    private readonly reloj: Reloj,
  ) {}

  /** Traza a la que pertenecen sus spans. */
  idTraza(): string {
    return this.trazaId;
  }

  /** Abre un span y devuelve su identificador, para poder colgar hijos. */
  iniciar(nombre: string, tipo: TipoSpan, padre?: string | null): string {
    const id = randomUUID();

    this.abiertos.set(id, {
      id,
      parentId: padre ?? null,
      nombre,
      tipo,
      inicio: this.reloj.ahora(),
      fechaInicio: this.reloj.fecha(),
    });

    return id;
  }

  /**
   * Cierra el span. Los atributos se reciben ya redactados; aquí solo se copian.
   * Cerrar un span que no existe se ignora en lugar de romper la petición: la
   * instrumentación nunca debe ser la causa de un fallo de negocio.
   */
  cerrar(id: string, estado: EstadoSpan, atributos?: Json): void {
    const abierto = this.abiertos.get(id);
    if (!abierto) {
      return;
    }

    this.abiertos.delete(id);

    this.spansCerrados.push({
      id_span: abierto.id,
      id_traza: this.trazaId,
      parent_id: abierto.parentId,
      nombre: abierto.nombre,
      tipo: abierto.tipo,
      duracion_ms: Math.max(0, Math.round(this.reloj.ahora() - abierto.inicio)),
      estado,
      atributos: atributos ?? null,
      fecha_inicio: abierto.fechaInicio,
    });
  }

  /** Los spans cerrados, en el orden en que se cerraron. */
  cerrados(): Span[] {
    return [...this.spansCerrados];
  }
}
