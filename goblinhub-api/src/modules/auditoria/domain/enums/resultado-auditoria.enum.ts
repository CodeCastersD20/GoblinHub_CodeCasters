/**
 * Desenlace de la operación auditada (#212).
 *
 * Se guarda como columna propia y no se deduce del código HTTP al consultar
 * porque el criterio pide filtrar por «resultado»: sin este valor materializado
 * el filtro tendría que interpretar rangos de códigos y un `500` y un `404`
 * acabarían mezclándose bajo la misma etiqueta.
 */
export type ResultadoAuditoria = 'exitoso' | 'rechazado' | 'fallido';

export const RESULTADOS_AUDITORIA: readonly ResultadoAuditoria[] = [
  'exitoso',
  'rechazado',
  'fallido',
];

export const esResultadoAuditoria = (
  valor: unknown,
): valor is ResultadoAuditoria =>
  typeof valor === 'string' &&
  (RESULTADOS_AUDITORIA as readonly string[]).includes(valor);

/**
 * Deriva el resultado a partir del código de respuesta final.
 *
 * `rechazado` separa los `401` y `403` —la petición ni siquiera llegó a
 * ejecutarse— de un `fallido`, que sí llegó a hacer algo y no terminó bien. Es
 * la distinción que hace el criterio de «casos permitidos, rechazados y
 * fallidos», derivada del código porque es el único dato que describe el
 * desenlace de forma inequívoca.
 */
export const resultadoDeEstado = (estadoHttp: number): ResultadoAuditoria => {
  if (estadoHttp === 401 || estadoHttp === 403) return 'rechazado';
  if (estadoHttp >= 400) return 'fallido';

  return 'exitoso';
};
