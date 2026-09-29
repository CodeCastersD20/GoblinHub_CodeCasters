/**
 * Severidad de una traza. Es la columna que hace cumplir «definir niveles de
 * log» del alcance de #204: con un nivel mínimo configurado, la instrumentación
 * decide qué se guarda comparando contra estos tres valores.
 *
 * Se declara como unión de literales y no como `enum` de TypeScript porque solo
 * travels entre la dominio y una columna `VarChar`: un enum exigiría convertirlo
 * en los dos bordes y no aporta la verificación en tiempo de compilación que sí
 * aporta la unión.
 */
export type NivelTraza = 'info' | 'warn' | 'error';

/** El orden importa: `indice` es la posición en la escala de menor a mayor. */
export const NIVELES_TRAZA: readonly NivelTraza[] = ['info', 'warn', 'error'];

export const esNivelTraza = (valor: unknown): valor is NivelTraza =>
  typeof valor === 'string' && (NIVELES_TRAZA as readonly string[]).includes(valor);

/**
 * Deriva el nivel a partir del código de respuesta: `info` por debajo de 400,
 * `warn` en 4xx y `error` en 5xx.
 *
 * Se deriva y no se recibe como parámetro porque el código de estado es el único
 * dato que la instrumentación conoce con certeza antes de que la respuesta viaje
 * al cliente; aceptar un nivel aparte obligaría a mantener sincronizados dos
 * valores que describen lo mismo y que se contradirían sin que nadie lo notase.
 */
export const nivelDeEstado = (estadoHttp: number): NivelTraza => {
  if (estadoHttp >= 500) return 'error';
  if (estadoHttp >= 400) return 'warn';

  return 'info';
};
