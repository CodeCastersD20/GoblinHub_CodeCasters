import { Traza } from '../entities/traza.entity';
import { Span } from '../entities/span.entity';

/**
 * Filtros de `GET /traces`, ya traducidos al dominio. Todos son opcionales: un
 * filtro ausente se omite del `where` en lugar de llegar como `undefined`, porque
 * en Prisma `metodo: undefined` es una condición vacía pero `metodo: ''` busca
 * la cadena vacía y no devuelve nada, que es un fallo silencioso.
 *
 * El conjunto es exactamente el que nombra el alcance de #204 —servicio,
 * operación, estado y periodo— más `ambiente`, que es el «despliegue» del
 * criterio de aceptación. No hay más filtros porque no hay más requisitos: un
 * parámetro que nadie pidió es superficie de API que hay que mantener.
 */
export type FiltrosTrazas = {
  servicio?: string;
  metodo?: string;
  ruta?: string;
  estado?: number;
  ambiente?: string;
  desde?: Date;
  hasta?: Date;
};

export type PaginacionTrazas = {
  page: number;
  limit: number;
  includeTotal: boolean;
};

/**
 * `total` es `null` cuando no se pidió el recuento. Distinguirlo de `0` importa:
 * cero afirma que no hay resultados, mientras que `null` afirma que no se ha
 * preguntado, y el visor no debe mostrar «0» donde en realidad no lo sabe.
 */
export type ListadoTrazas = {
  trazas: Traza[];
  total: number | null;
};

export type TrazaConSpans = {
  traza: Traza;
  spans: Span[];
};

export abstract class TrazaRepository {
  /**
   * Persiste la traza y sus spans en el mismo asiento. Si el guardado falla, se
   * propaga el error para que quien llama lo registre: la traza es el único
   * registro de la petición, así que no puede fallar en silencio.
   */
  abstract guardar(traza: Traza, spans: Span[]): Promise<void>;

  /**
   * `GET /traces`. Devuelve la página pedida en orden descendente por
   * `fecha_inicio`, que es como se lee un historial: lo más reciente primero.
   *
   * `includeTotal` se propaga para que la implementación decida si gasta una
   * segunda consulta en el `COUNT`.
   */
  abstract listar(
    filtros: FiltrosTrazas,
    paginacion: PaginacionTrazas,
  ): Promise<ListadoTrazas>;

  /**
   * `GET /traces/:correlationId`. Devuelve `null` en lugar de lanzar: que no
   * exista es un caso de negocio, y el 404 lo compone el caso de uso, que es
   * quien conoce el mensaje que ve el administrador.
   *
   * Los pasos vienen con la traza en la misma consulta para que el visor no
   * tenga dos viajes al servidor para pintar una pantalla.
   */
  abstract obtenerPorCorrelationId(
    correlationId: string,
  ): Promise<TrazaConSpans | null>;

  /**
   * Borra las trazas iniciadas antes de `anteriorA` y devuelve cuántas eran.
   *
   * El borrado es físico y no lógico a propósito: es la excepción que la
   * constitución exige justificar cuando la regla general es no borrar. Una
   * traza retenida en la base por soft-delete seguiría ocupando el sitio que la
   * retención existe para liberar, y además impediría que las escrituras
   * volvieran a reutilizar la clave de correlación.
   */
  abstract purgarVencidas(anteriorA: Date): Promise<{ count: number }>;
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
