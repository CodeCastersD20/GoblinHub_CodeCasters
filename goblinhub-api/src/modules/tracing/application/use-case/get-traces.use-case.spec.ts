import { GetTracesQueryDto } from '../dtos/get-traces-query.dto';
import { GetTracesUseCase } from './get-traces.use-case';
import { Traza } from '../../domain/entities/traza.entity';
import {
  type FiltrosTrazas,
  type ListadoTrazas,
  type PaginacionTrazas,
  TrazaRepository,
} from '../../domain/repositories/traza.repository';

const trazaDe = (numero: number): Traza =>
  new Traza(
    `id-traza-${numero}`,
    `corr-${numero}`,
    'GET',
    '/events',
    200,
    10 + numero,
    'development',
    new Date(`2026-01-0${numero}T10:00:00.000Z`),
    new Date(`2026-01-0${numero}T10:00:01.000Z`),
    '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73',
    null,
  );

/**
 * Doble de mano en lugar del mocking automático de Nest: el port es una clase
 * abstracta y un `jest.mock` del módulo dejaría de comprobar que el caso de uso
 * habla con el port y no con Prisma.
 */
class TrazaRepositoryDoble extends TrazaRepository {
  readonly llamadasListar: {
    filtros: FiltrosTrazas;
    paginacion: PaginacionTrazas;
  }[] = [];

  listado: ListadoTrazas = { trazas: [], total: 0 };

  guardar(): Promise<void> {
    return Promise.reject(new Error('no se usa al listar'));
  }

  listar(
    filtros: FiltrosTrazas,
    paginacion: PaginacionTrazas,
  ): Promise<ListadoTrazas> {
    this.llamadasListar.push({ filtros, paginacion });
    return Promise.resolve(this.listado);
  }

  obtenerPorCorrelationId(): Promise<never> {
    return Promise.reject(new Error('no se usa al listar'));
  }

  purgarVencidas(): Promise<never> {
    return Promise.reject(new Error('no se usa al listar'));
  }
}

const consulta = (
  valores: Partial<GetTracesQueryDto> = {},
): GetTracesQueryDto => Object.assign(new GetTracesQueryDto(), valores);

describe('GetTracesUseCase', () => {
  let repositorio: TrazaRepositoryDoble;
  let casoDeUso: GetTracesUseCase;

  beforeEach(() => {
    repositorio = new TrazaRepositoryDoble();
    casoDeUso = new GetTracesUseCase(repositorio);
  });

  describe('paginación', () => {
    it('empieza en la primera página de cincuenta trazas', async () => {
      await casoDeUso.execute(consulta());

      expect(repositorio.llamadasListar[0].paginacion).toEqual({
        page: 1,
        limit: 50,
        includeTotal: false,
      });
    });

    it('respeta la página y el límite que se le piden', async () => {
      await casoDeUso.execute(consulta({ page: 4, limit: 25 }));

      const paginacion = repositorio.llamadasListar[0].paginacion;

      expect(paginacion.page).toBe(4);
      expect(paginacion.limit).toBe(25);
    });

    it('devuelve la página pedida y su tamaño junto a los datos', async () => {
      repositorio.listado = { trazas: [trazaDe(1), trazaDe(2)], total: 57 };

      const resultado = await casoDeUso.execute(
        consulta({ page: 3, limit: 2 }),
      );

      expect(resultado.page).toBe(3);
      expect(resultado.limit).toBe(2);
      expect(resultado.total).toBe(57);
      expect(resultado.data).toHaveLength(2);
    });

    it('pide el total al repositorio solo cuando se le ha pedido', async () => {
      await casoDeUso.execute(consulta({ includeTotal: true }));

      expect(repositorio.llamadasListar[0].paginacion.includeTotal).toBe(true);
    });

    it('no inventa un total cero cuando el total no se ha pedido', async () => {
      repositorio.listado = { trazas: [trazaDe(1)], total: null };

      const resultado = await casoDeUso.execute(consulta());

      expect(resultado.total).toBeNull();
    });

    it('devuelve una lista vacía en lugar de un error en una página que no existe', async () => {
      repositorio.listado = { trazas: [], total: 57 };

      const resultado = await casoDeUso.execute(consulta({ page: 999 }));

      expect(resultado.data).toEqual([]);
      expect(resultado.total).toBe(57);
    });
  });

  describe('filtros', () => {
    it('no filtra por nada cuando no se pasa ningún parámetro', async () => {
      await casoDeUso.execute(consulta());

      expect(repositorio.llamadasListar[0].filtros).toEqual({});
    });

    it('traslada al repositorio los filtros que nombra el alcance de #204', async () => {
      const desde = new Date('2026-01-01T00:00:00.000Z');
      const hasta = new Date('2026-01-31T23:59:59.000Z');

      await casoDeUso.execute(
        consulta({
          servicio: 'goblinhub-api',
          metodo: 'GET',
          ruta: '/events',
          estado: 500,
          ambiente: 'staging',
          desde: desde.toISOString(),
          hasta: hasta.toISOString(),
        }),
      );

      expect(repositorio.llamadasListar[0].filtros).toEqual({
        servicio: 'goblinhub-api',
        metodo: 'GET',
        ruta: '/events',
        estado: 500,
        ambiente: 'staging',
        desde,
        hasta,
      });
    });

    it('filtra por servicio, que es el primero que pide el alcance', async () => {
      await casoDeUso.execute(consulta({ servicio: 'otro-servicio' }));

      expect(repositorio.llamadasListar[0].filtros).toEqual({
        servicio: 'otro-servicio',
      });
    });

    it('descarta un filtro vacío en lugar de buscar la cadena vacía', async () => {
      await casoDeUso.execute(consulta({ servicio: '' }));

      expect(repositorio.llamadasListar[0].filtros).toEqual({});
    });
  });

  describe('rango de fechas invertido', () => {
    it('devuelve una lista vacía con total cero sin tocar la base de datos', async () => {
      const resultado = await casoDeUso.execute(
        consulta({
          desde: '2026-02-01T00:00:00.000Z',
          hasta: '2026-01-01T00:00:00.000Z',
          includeTotal: true,
        }),
      );

      expect(resultado).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
      });
      expect(repositorio.llamadasListar).toHaveLength(0);
    });

    it('devuelve total nulo si el total no se había pedido', async () => {
      const resultado = await casoDeUso.execute(
        consulta({
          desde: '2026-02-01T00:00:00.000Z',
          hasta: '2026-01-01T00:00:00.000Z',
        }),
      );

      expect(resultado.total).toBeNull();
    });
  });
});
