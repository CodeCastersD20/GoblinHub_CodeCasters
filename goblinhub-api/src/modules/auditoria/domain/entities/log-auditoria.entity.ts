import type { TipoActor } from '../enums/tipo-actor.enum';
import type { ResultadoAuditoria } from '../enums/resultado-auditoria.enum';

/**
 * Un registro de auditoría: quién hizo qué, sobre qué recurso, cuándo y con qué
 * resultado (#212).
 *
 * Tipo plano y sin herencia de lo que devuelve Prisma, con el mismo criterio
 * que `Traza` y `LogEntity`: si el modelo de la base cambia, el dominio no se
 * arrastra.
 *
 * Los campos `actor` no se persisten: son los datos del usuario resueltos por
 * lectura en el repositorio, para que el visor muestre un nombre en lugar de
 * un UUID sin que la tabla acabe guardando nombres, apellidos ni roles. Esa es
 * la minimización de datos del criterio 4.
 */
export class LogAuditoria {
  constructor(
    public id_auditoria: string,
    public actor_tipo: TipoActor,
    public actor_id: string | null,
    public accion: string,
    public recurso: string,
    public resultado: ResultadoAuditoria,
    public correlation_id: string,
    public fecha_hora: Date,
    public actor: {
      nombre: string;
      apellidos: string;
      rol: string;
    } | null = null,
  ) {}
}
