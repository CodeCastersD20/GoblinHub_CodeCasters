/**
 * Quién ejecutó la operación auditada (#212).
 *
 * Unión de literales y no `enum` de TypeScript, igual que `NivelTraza`: solo
 * viaja entre el dominio y la columna `"TipoActor"` de la base, y un enum
 * obligaría a convertirlo en los dos bordes sin aportar comprobación alguna.
 */
export type TipoActor = 'usuario' | 'anonimo' | 'sistema';

/** Los tres actores que nombra el alcance de #212. */
export const TIPOS_ACTOR: readonly TipoActor[] = [
  'usuario',
  'anonimo',
  'sistema',
];

export const esTipoActor = (valor: unknown): valor is TipoActor =>
  typeof valor === 'string' &&
  (TIPOS_ACTOR as readonly string[]).includes(valor);
