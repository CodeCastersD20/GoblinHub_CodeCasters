/**
 * Única fuente de verdad de la política de datos sensibles (FR-018, FR-033).
 *
 * `docs/TRAZABILIDAD.md` describe esta constante; nunca la sustituye. Si el
 * documento y este archivo discrepan, gana este archivo.
 */

/** Sustituye el valor de toda clave sensible. La clave se conserva. */
export const MARCADOR_REDACTADO = '[REDACTADO]';

/** Deja constancia de que el valor se recortó, para no leerlo como completo. */
export const SUFIJO_TRUNCADO = '[TRUNCADO]';

/** Longitud máxima de un valor de texto antes de recortarlo (FR-019). */
export const LONGITUD_MAXIMA_VALOR = 512;

/**
 * Se comparan contra la clave normalizada (minúsculas y sin `_`, `-` ni `.`),
 * así que `access_token`, `accessToken` y `ACCESS-TOKEN` caen en el mismo caso.
 */
export const CLAVES_SENSIBLES: readonly string[] = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'apikey',
  'servicekey',
  'privatekey',
  'credential',
  'refreshtoken',
  'accesstoken',
];

/**
 * Se guardan a propósito pese a contener datos de negocio. El motivo va en la
 * propia entrada, porque una excepción sin justificar es una excepción que
 * nadie revisa (FR-033).
 */
export const CLAVES_CONSERVADAS: Readonly<Record<string, string>> = {
  id_usuario:
    'Dato de auditoría: sin él no se puede atribuir la acción a una persona.',
  correlationid:
    'No es un secreto: es lo que permite correlacionar la traza con el log de actividad.',
};

/** Normaliza una clave para compararla sin distinguir mayúsculas ni separadores. */
export function normalizarClave(clave: string): string {
  return clave.toLowerCase().replace(/[_\-.]/g, '');
}
