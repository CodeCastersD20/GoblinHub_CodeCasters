/**
 * Una petición completa, ya instrumentada.
 *
 * Tipo plano y sin herencia de lo que genera Prisma: si el modelo de la base de
 * datos cambia, el dominio no se arrastra. Es el mismo criterio que siguen
 * `events` y `logs`.
 */
export class Traza {
  constructor(
    public id_traza: string,
    public correlation_id: string,
    public metodo: string,
    public ruta: string,
    public estado_http: number,
    public duracion_ms: number,
    public ambiente: string,
    public fecha_inicio: Date,
    public fecha_fin: Date,
    public id_usuario?: string | null,
    public error?: string | null,
  ) {}
}
