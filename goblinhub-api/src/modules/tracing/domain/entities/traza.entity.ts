/**
 * Una petición completa, ya instrumentada.
 *
 * Tipo plano y sin herencia de lo que genera Prisma: si el modelo de la base de
 * datos cambia, el dominio no se arrastra. Es el mismo criterio que siguen
 * `events` y `logs`.
 *
 * `servicio` y `nivel` van al final y con valor por defecto porque son los dos
 * campos que implementan el «definir niveles» y el «filtrar por servicio» del
 * alcance de #204, y las pruebas que construyen trazas a mano no necesitan
 * declararlos para nada más.
 */
import type { NivelTraza } from '../enums/nivel-traza.enum';
import { CONFIGURACION_TRACING_POR_DEFECTO } from '../constants/tracing-config';

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
    public nivel: NivelTraza = 'info',
    public servicio: string = CONFIGURACION_TRACING_POR_DEFECTO.servicio,
  ) {}
}
