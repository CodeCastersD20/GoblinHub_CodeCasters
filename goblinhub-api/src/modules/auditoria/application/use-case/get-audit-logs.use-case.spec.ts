import { GetAuditLogsUseCase } from './get-audit-logs.use-case';
import { GetAuditLogsQueryDto } from '../dtos/get-audit-logs-query.dto';
import { LogAuditoria } from '../../domain/entities/log-auditoria.entity';
import type {
  FiltrosAuditoria,
  ListadoAuditoria,
  PaginacionAuditoria,
  RegistroAuditoria,
} from '../../domain/repositories/log-auditoria.repository';

const registro = () =>
  new LogAuditoria(
    '1',
    'usuario',
    '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73',
    'POST',
    '/events',
    'exitoso',
    'a1b2c3d4-1111-4222-8333-444455556666',
    new Date('2026-01-01T10:00:00.000Z'),
  );

const consulta = (valores: Partial<GetAuditLogsQueryDto> = {}) =>
  Object.assign(new GetAuditLogsQueryDto(), valores);

describe('GetAuditLogsUseCase', () => {
  let repositorio: {
    listar: jest.Mock<
      Promise<ListadoAuditoria>,
      [FiltrosAuditoria, PaginacionAuditoria]
    >;
    registrar: jest.Mock<Promise<void>, [RegistroAuditoria]>;
  };
  let casoDeUso: GetAuditLogsUseCase;
  let filtros: FiltrosAuditoria | undefined;
  let paginacion: PaginacionAuditoria | undefined;

  beforeEach(() => {
    filtros = undefined;
    paginacion = undefined;
    repositorio = {
      registrar: jest.fn<Promise<void>, [RegistroAuditoria]>(),
      listar: jest
        .fn<
          Promise<ListadoAuditoria>,
          [FiltrosAuditoria, PaginacionAuditoria]
        >()
        .mockResolvedValue({ registros: [registro()], total: 1 }),
    };
    casoDeUso = new GetAuditLogsUseCase(repositorio);
    repositorio.listar.mockImplementation(
      (f: FiltrosAuditoria, p: PaginacionAuditoria) => {
        filtros = f;
        paginacion = p;
        return Promise.resolve({ registros: [registro()], total: 1 });
      },
    );
  });

  it('devuelve la página pedida con la forma que consume el visor', async () => {
    const respuesta = await casoDeUso.execute(consulta({ page: 2, limit: 10 }));

    expect(respuesta).toEqual({
      data: [registro()],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(paginacion).toEqual({ page: 2, limit: 10, includeTotal: false });
  });

  it('traduce los cinco filtros del criterio sin inventar condiciones', async () => {
    await casoDeUso.execute(
      consulta({
        actor: 'ana',
        accion: 'DELETE',
        recurso: '/products',
        resultado: 'fallido',
        desde: '2026-01-01T00:00:00.000Z',
        hasta: '2026-01-31T23:59:59.999Z',
      }),
    );

    expect(filtros).toEqual({
      actor: 'ana',
      accion: 'DELETE',
      recurso: '/products',
      resultado: 'fallido',
      desde: new Date('2026-01-01T00:00:00.000Z'),
      hasta: new Date('2026-01-31T23:59:59.999Z'),
    });
  });

  it('omite los filtros ausentes en lugar de pasarlos vacíos', async () => {
    await casoDeUso.execute(consulta());

    expect(filtros).toEqual({});
    expect(repositorio.listar).toHaveBeenCalledTimes(1);
  });

  it('devuelve lista vacía con 200 cuando el rango está invertido', async () => {
    const respuesta = await casoDeUso.execute(
      consulta({
        desde: '2026-02-01T00:00:00.000Z',
        hasta: '2026-01-01T00:00:00.000Z',
        includeTotal: true,
      }),
    );

    expect(respuesta).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
    });
    expect(repositorio.listar).not.toHaveBeenCalled();
  });

  it('devuelve el total en null cuando no se pidió contar', async () => {
    repositorio.listar.mockResolvedValue({ registros: [], total: null });

    const respuesta = await casoDeUso.execute(consulta());

    expect(respuesta.total).toBeNull();
  });
});
