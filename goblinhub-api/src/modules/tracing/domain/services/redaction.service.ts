import { Injectable } from '@nestjs/common';
import {
  CLAVES_CONSERVADAS,
  CLAVES_SENSIBLES,
  LONGITUD_MAXIMA_VALOR,
  MARCADOR_REDACTADO,
  SUFIJO_TRUNCADO,
  normalizarClave,
} from '../constants/redaction-keys';

/** JSON serializable: lo que devuelve la redacción y lo que se persiste. */
export type Json =
  string | number | boolean | null | Json[] | { [clave: string]: Json };

/**
 * Enmascara los secretos de los atributos de un paso **antes** de escribirlos
 * (FR-017). Enmascarar en la lectura no serviría de nada: si el secreto ya está
 * en la base de datos, quien tenga acceso a ella lo tiene igual.
 *
 * El recorrido es inmutable a propósito: devuelve estructuras nuevas y nunca
 * toca el objeto recibido, para que el llamante pueda seguir usando el original
 * (por ejemplo, para el log de consola).
 */
@Injectable()
export class RedactionService {
  redactar(atributos: unknown): Json {
    return this.recorrer(atributos) as Json;
  }

  private recorrer(valor: unknown): unknown {
    if (typeof valor === 'string') {
      return this.truncar(valor);
    }

    if (Array.isArray(valor)) {
      return valor.map((elemento) => this.recorrer(elemento));
    }

    if (valor !== null && typeof valor === 'object') {
      return this.recorrerObjeto(valor as Record<string, unknown>);
    }

    return valor;
  }

  private recorrerObjeto(
    objeto: Record<string, unknown>,
  ): Record<string, unknown> {
    const salida: Record<string, unknown> = {};

    for (const [clave, valor] of Object.entries(objeto)) {
      salida[clave] = this.debeEnmascarar(clave)
        ? MARCADOR_REDACTADO
        : this.recorrer(valor);
    }

    return salida;
  }

  /**
   * Una clave conservada gana siempre: es una excepción deliberada y
   * documentada, no un descuido de la lista de sensibles.
   */
  private debeEnmascarar(clave: string): boolean {
    const normalizada = normalizarClave(clave);

    if (normalizada in CLAVES_CONSERVADAS) {
      return false;
    }

    return CLAVES_SENSIBLES.some((sensible) => normalizada.includes(sensible));
  }

  private truncar(texto: string): string {
    if (texto.length <= LONGITUD_MAXIMA_VALOR) {
      return texto;
    }

    return `${texto.slice(0, LONGITUD_MAXIMA_VALOR)}…${SUFIJO_TRUNCADO}`;
  }
}
