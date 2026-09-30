import { Inject, Injectable } from '@nestjs/common';
import { GetAuditLogsQueryDto } from '../dtos/get-audit-logs-query.dto';
import { LogAuditoria } from '../../domain/entities/log-auditoria.entity';
import {
  AUDITORIA_REPOSITORY,
  type FiltrosAuditoria,
  type LogAuditoriaRepository,
} from '../../domain/repositories/log-auditoria.repository';

/**
 * Mismo contrato que `GET /logs` y `GET /traces` para que las tres vistas se
 * lean igual en la misma pantalla.
 */
export type ListadoAuditoriaRespuesta = {
  data: LogAuditoria[];
  total: number | null;
  page: number;
  limit: number;
};

@Injectable()
export class GetAuditLogsUseCase {
  constructor(
    @Inject(AUDITORIA_REPOSITORY)
    private readonly repositorio: LogAuditoriaRepository,
  ) {}

  async execute(
    consulta: GetAuditLogsQueryDto,
  ): Promise<ListadoAuditoriaRespuesta> {
    const { page, limit, includeTotal } = consulta;
    const filtros = this.aFiltros(consulta);

    // Un rango invertido no es un error de quien llama: es un rango que no
    // contiene nada. Se responde 200 con lista vacía, igual que hace el visor
    // de trazas, y sin gastar una consulta que solo devolvería cero filas.
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      return {
        data: [],
        total: includeTotal ? 0 : null,
        page,
        limit,
      };
    }

    const { registros, total } = await this.repositorio.listar(filtros, {
      page,
      limit,
      includeTotal,
    });

    return { data: registros, total, page, limit };
  }

  /**
   * Traduce la consulta HTTP a filtros del dominio. Se omiten los parámetros no
   * presentes: un `where` con `actor: undefined` es una condición vacía en
   * Prisma, pero con `actor: ''` buscaría la cadena vacía y no devolvería nada,
   * que es un fallo silencioso difícil de diagnosticar.
   */
  private aFiltros(consulta: GetAuditLogsQueryDto): FiltrosAuditoria {
    const filtros: FiltrosAuditoria = {};

    if (consulta.actor) filtros.actor = consulta.actor;
    if (consulta.accion) filtros.accion = consulta.accion;
    if (consulta.recurso) filtros.recurso = consulta.recurso;
    if (consulta.resultado) filtros.resultado = consulta.resultado;

    if (consulta.desde) filtros.desde = new Date(consulta.desde);
    if (consulta.hasta) filtros.hasta = new Date(consulta.hasta);

    return filtros;
  }
}
