import { TracingContextService } from './tracing-context.service';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('TracingContextService', () => {
  let contexto: TracingContextService;

  beforeEach(() => {
    contexto = new TracingContextService();
  });

  it('publica el identificador dentro de run y lo retira al salir', () => {
    let dentro: string | undefined;

    contexto.run('id-de-prueba', () => {
      dentro = contexto.get();
    });

    expect(dentro).toBe('id-de-prueba');
    expect(contexto.get()).toBeUndefined();
  });

  it('sigue disponible dentro de un setTimeout', (hecho) => {
    contexto.run('id-async', () => {
      setTimeout(() => {
        expect(contexto.get()).toBe('id-async');
        hecho();
      }, 0);
    });
  });

  it('no mezcla el valor entre dos peticiones concurrentes', async () => {
    const leer = (identificador: string, retardo: number) =>
      new Promise<string | undefined>((resolver) => {
        contexto.run(identificador, () => {
          setTimeout(() => resolver(contexto.get()), retardo);
        });
      });

    const [primera, segunda] = await Promise.all([
      leer('id-de-la-primera', 20),
      leer('id-de-la-segunda', 5),
    ]);

    expect(primera).toBe('id-de-la-primera');
    expect(segunda).toBe('id-de-la-segunda');
  });

  it('getOrCreate devuelve el identificador ya publicado', () => {
    contexto.run('id-publicado', () => {
      expect(contexto.getOrCreate()).toBe('id-publicado');
    });
  });

  it('getOrCreate genera un identificador propio fuera de una petición', () => {
    // Es el caso de los cron jobs: no hay petición entrante que lo publique.
    expect(contexto.getOrCreate()).toMatch(UUID_V4);
  });

  it('getOrCreate genera un identificador distinto cada vez fuera de una petición', () => {
    expect(contexto.getOrCreate()).not.toBe(contexto.getOrCreate());
  });
});
