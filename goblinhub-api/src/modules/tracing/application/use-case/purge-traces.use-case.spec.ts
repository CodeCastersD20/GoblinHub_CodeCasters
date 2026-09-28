import { PurgeTracesUseCase } from './purge-traces.use-case';
import { TrazaRepository } from '../../domain/repositories/traza.repository';

class TrazaRepositoryDoble extends TrazaRepository {
  readonly Limits: Date[] = [];
  count = 0;

  guardar(): Promise<void> {
    return Promise.reject(new Error('no se usa al purgar'));
  }

  listar(): Promise<never> {
    return Promise.reject(new Error('no se usa al purgar'));
  }

  obtenerPorCorrelationId(): Promise<never> {
    return Promise.reject(new Error('no se usa al purgar'));
  }

  purgarVencidas(anteriorA: Date): Promise<{ count: number }> {
    this.Limits.push(anteriorA);
    return Promise.resolve({ count: this.count });
  }
}

describe('PurgeTracesUseCase', () => {
  let repositorio: TrazaRepositoryDoble;
  let casoDeUso: PurgeTracesUseCase;

  beforeEach(() => {
    repositorio = new TrazaRepositoryDoble();
    casoDeUso = new PurgeTracesUseCase(repositorio);
  });

  it('delega en el repositorio el instante de corte que le pasan', async () => {
    const corte = new Date('2026-09-21T03:17:00.000Z');

    await casoDeUso.execute(corte);

    expect(repositorio.Limits).toEqual([corte]);
  });

  it('devuelve cuántas trazas eliminó', async () => {
    repositorio.count = 42;

    const resultado = await casoDeUso.execute(new Date());

    expect(resultado).toEqual({ trazasEliminadas: 42 });
  });

  it('devuelve cero, y no un error, cuando no hay nada vencido', async () => {
    repositorio.count = 0;

    await expect(casoDeUso.execute(new Date())).resolves.toEqual({
      trazasEliminadas: 0,
    });
  });

  it('propaga el fallo del repositorio para que el programador lo registre', async () => {
    jest
      .spyOn(repositorio, 'purgarVencidas')
      .mockRejectedValue(new Error('la tabla no existe'));

    await expect(casoDeUso.execute(new Date())).rejects.toThrow(
      'la tabla no existe',
    );
  });
});
