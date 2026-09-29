import { Injectable } from '@nestjs/common';

/** Ancho de la columna `trazas.ruta`. */
const ANCHO_MAXIMO = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERICO = /^\d+$/;

@Injectable()
export class PathNormalizerService {
  /**
   * Sustituye por `:id` el segmento que identifica un recurso (FR-020).
   *
   * Sin esto, `/events/<uuid-1>` y `/events/<uuid-2>` serían dos rutas
   * distintas: cada recurso crearía su fila y el índice de `ruta` se dispersaría
   * hasta hacerlo inútil. La ruta literal no se guarda en ninguna parte, así que
   * la base de datos no acaba llena de identificadores de recurso.
   */
  normalizar(ruta: string): string {
    const normalizada = ruta
      .split('/')
      .map((segmento) => this.normalizarSegmento(segmento))
      .join('/');

    return this.acortar(normalizada);
  }

  private normalizarSegmento(segmento: string): string {
    // Un marcador existente se deja como está: normalizar dos veces no debe
    // convertir `:id` en `:id:id`.
    if (segmento.startsWith(':')) {
      return segmento;
    }

    if (
      UUID.test(segmento) ||
      NUMERICO.test(segmento) ||
      this.esEnteroDe32Digitos(segmento)
    ) {
      return ':id';
    }

    return segmento;
  }

  /**
   * Un entero de 32 dígitos sin guiones, tal y como fija `data-model.md`. Se
   * contempla por si en el futuro aparece un identificador con ese formato. Un
   * UUID lleva guiones, así que no entra por aquí: lo captura la regla de arriba.
   *
   * Solo dígitos y no hexadecimal a propósito: un segmento de 32 caracteres
   * hexadecimales podría ser un literal de ruta legítimo, y normalizarlo sería
   * inventarse una regla que la especificación no contiene.
   */
  private esEnteroDe32Digitos(segmento: string): boolean {
    return segmento.length === 32 && NUMERICO.test(segmento);
  }

  /**
   * Si la ruta supera el ancho de la columna, se recorta por la derecha y se
   * conserva el comienzo. Para entonces los identificadores ya son `:id`, así
   * que lo que se descarta es cola de ruta, no información de recurso: ni la
   * ruta original ni su versión normalizada se guardan en la base de datos, así
   * que un recorte no puede filtrar identificadores (FR-020).
   */
  private acortar(ruta: string): string {
    if (ruta.length <= ANCHO_MAXIMO) {
      return ruta;
    }

    return ruta.slice(0, ANCHO_MAXIMO);
  }
}
