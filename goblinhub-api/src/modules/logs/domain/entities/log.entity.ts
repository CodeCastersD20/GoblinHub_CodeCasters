export enum TipoLog {
  SUCCESS = 'success',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

export class LogEntity {
  id_log: string;
  tipo: TipoLog;
  accion: string;
  mensaje: string;
  id_usuario?: string | null;
  ip_address?: string | null;

  // 👇 AQUÍ ESTÁ EL CAMBIO. Quitamos el "any" 👇
  datos_extra?: Record<string, unknown> | null;

  fecha_hora: Date;

  usuario?: {
    nombre: string;
    apellidos: string;
    rol?: string;
  } | null;
}
