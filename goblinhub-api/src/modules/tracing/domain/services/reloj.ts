/**
 * Separación entre los dos relojes, porque no sirven para lo mismo.
 *
 * Las duraciones se miden con el reloj monotónico: si el sistema ajusta la hora
 * mientras corre la petición, un reloj de pared daría duraciones negativas o
 * absurdas. Las marcas de tiempo sí necesitan reloj de pared, porque tienen que
 * ser comparables con las de otras peticiones y con las del resto del sistema.
 */
export interface Reloj {
  /** Milisegundos monotónicos. Solo para duraciones. */
  ahora(): number;
  /** Reloj de pared. Para saber cuándo ocurrió algo. */
  fecha(): Date;
}

export class RelojSistema implements Reloj {
  ahora(): number {
    return performance.now();
  }

  fecha(): Date {
    return new Date();
  }
}
