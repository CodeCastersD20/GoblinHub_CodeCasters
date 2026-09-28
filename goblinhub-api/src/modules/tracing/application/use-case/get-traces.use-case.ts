import { Inject, Injectable } from '@nestjs/common';
import { GetTracesQueryDto } from '../dtos/get-traces-query.dto';
import { Traza } from '../../domain/entities/traza.entity';
import {
  type FiltrosTrazas,
  TRAZA_REPOSITORY,
  TrazaRepository,
} from '../../domain/repositories/traza.repository';

/**
 * `limit`, no `size`, como nombre del tamaño de página: es lo que ya devuelve
 * `GET /logs` y el visor consume las dos listas en la misma pantalla. Dos
 * nombres para el mismo dato obligarían al frontend a traducir uno de ellos.
 */
export type ListadoTrazasRespuesta = {
  data: Traza[];
  total: number | null;
  page: number;
  limit: number;
};

@Injectable()
export class GetTracesUseCase {
  constructor(
    @Inject(TRAZA_REPOSITORY)
    private readonly trazaRepository: TrazaRepository,
  ) {}

  async execute(consulta: GetTracesQueryDto): Promise<ListadoTrazasRespuesta> {
    const { page, limit, includeTotal } = consulta;
    const filtros = this.aFiltros(consulta);

    // Un rango invertido no es un error de quien llama: es un rango que no
    // contiene nada. Se responde 200 con lista vacía, tal y como pide
    // `data-model.md`, y sin gastar una consulta que solo va a traer cero filas.
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      return {
        data: [],
        total: includeTotal ? 0 : null,
        page,
        limit,
      };
    }

    const { trazas, total } = await this.trazaRepository.listar(filtros, {
      page,
      limit,
      includeTotal,
    });

    return { data: trazas, total, page, limit };
  }

  /**
   * Traduce la consulta HTTP a filtros del dominio. Se omiten los parámetros no
   * presentes: un `where` con `metodo: undefined` se traduce en una condición
   * vacía en Prisma, pero con `metodo: ''` buscaría la cadena vacía y no
   * devolvería nada, que es un fallo silencioso difícil de diagnosticar.
   */
  private aFiltros(consulta: GetTracesQueryDto): FiltrosTrazas {
    const filtros: FiltrosTrazas = {};

    if (consulta.servicio) filtros.servicio = consulta.servicio;
    if (consulta.metodo) filtros.metodo = consulta.metodo;
    if (consulta.ruta) filtros.ruta = consulta.ruta;
    if (consulta.estado !== undefined) filtros.estado = consulta.estado;
    if (consulta.ambiente) filtros.ambiente = consulta.ambiente;

    if (consulta.desde) filtros.desde = new Date(consulta.desde);
    if (consulta.hasta) filtros.hasta = new Date(consulta.hasta);

    return filtros;
  }
}
