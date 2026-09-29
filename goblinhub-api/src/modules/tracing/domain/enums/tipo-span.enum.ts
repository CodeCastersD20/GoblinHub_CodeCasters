/**
 * natureza del paso medido. Es un catálogo cerrado y no texto libre: un `tipo`
 * desconocido se rompería la vista del visor, que agrupa y colorea por aquí.
 */
export enum TipoSpan {
  http = 'http',
  auth = 'auth',
  prisma = 'prisma',
  cron = 'cron',
  redis = 'redis',
}

/** Resultado del paso. Se fija al cerrarlo y no vuelve a cambiar. */
export enum EstadoSpan {
  ok = 'ok',
  error = 'error',
}

/** Extrae el catálogo como lista, para validar y para los menús del visor. */
export const TIPOS_SPAN: readonly TipoSpan[] = Object.values(TipoSpan);
export const ESTADOS_SPAN: readonly EstadoSpan[] = Object.values(EstadoSpan);
