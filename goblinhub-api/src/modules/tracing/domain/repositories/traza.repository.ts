import { Traza } from '../entities/traza.entity';
import { Span } from '../entities/span.entity';

export abstract class TrazaRepository {
  /**
   * Persiste la traza y sus spans en el mismo asiento. Si el guardado falla, se
   * propaga el error para que quien llama lo registre: la traza es el único
   * registro de la petición, así que no puede fallar en silencio.
   */
  abstract guardar(traza: Traza, spans: Span[]): Promise<void>;
}

/**
 * Token de inyección con el nombre que fija la especificación.
 *
 * Apunta a la propia clase abstracta y no a un `Symbol` para no ser la única
 * pieza del proyecto que se registra de otra manera: el resto de módulos usan la
 * clase abstracta como token, y que aquí también lo sea mantiene el módulo
 * legible con la vista de un solo golpe.
 */
export const TRAZA_REPOSITORY = TrazaRepository;
