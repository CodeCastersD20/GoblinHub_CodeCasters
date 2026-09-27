import { EstadoSpan, TipoSpan } from '../enums/tipo-span.enum';
import type { Json } from '../services/redaction.service';

/**
 * Un paso interno de la traza. El árbol se reconstruye con `parent_id`, y un
 * `parent_id` nulo marca la raíz.
 */
export class Span {
  constructor(
    public id_span: string,
    public id_traza: string,
    public nombre: string,
    public tipo: TipoSpan,
    public duracion_ms: number,
    public estado: EstadoSpan,
    public fecha_inicio: Date,
    public parent_id?: string | null,
    /** Ya redactado por `RedactionService` antes de llegar aquí. */
    public atributos?: Json | null,
  ) {}
}
