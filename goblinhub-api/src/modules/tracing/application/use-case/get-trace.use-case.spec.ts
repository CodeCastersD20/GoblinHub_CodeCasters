import { NotFoundException } from '@nestjs/common';
import { GetTraceUseCase } from './get-trace.use-case';
import { Span } from '../../domain/entities/span.entity';
import { Traza } from '../../domain/entities/traza.entity';
import { EstadoSpan, TipoSpan } from '../../domain/enums/tipo-span.enum';
import {
  TrazaRepository,
  type TrazaConSpans,
} from '../../domain/repositories/traza.repository';

const traza: Traza = new Traza(
  'traza-1',
  'corr-1',
  'GET',
  '/events/:id',
  200,
  120,
  'development',
  new Date('2026-01-01T10:00:00.000Z'),
  new Date('2026-01-01T10:00:00.120Z'),
  '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73',
  null,
);

const span = (
  id: string,
  parentId: string | null,
  nombre: string,
  milisegundos = 10,
): Span =>
  new Span(
    id,
    'traza-1',
    nombre,
    TipoSpan.http,
    milisegundos,
    EstadoSpan.ok,
    new Date(`2026-01-01T10:00:0${milisegundos % 10}.000Z`),
    parentId,
    null,
  );

class TrazaRepositoryDoble extends TrazaRepository {
  consultas: string[] = [];

  encontrado: TrazaConSpans | null = null;

  guardar(): Promise<void> {
    return Promise.reject(new Error('no se usa en el detalle'));
  }

  listar(): Promise<never> {
    return Promise.reject(new Error('no se usa en el detalle'));
  }

  obtenerPorCorrelationId(
    correlationId: string,
  ): Promise<TrazaConSpans | null> {
    this.consultas.push(correlationId);
    return Promise.resolve(this.encontrado);
  }

  purgarVencidas(): Promise<never> {
    return Promise.reject(new Error('no se usa en el detalle'));
  }
}
describe('GetTraceUseCase', () => {
  let repositorio: TrazaRepositoryDoble;
  let casoDeUso: GetTraceUseCase;

  beforeEach(() => {
    repositorio = new TrazaRepositoryDoble();
    casoDeUso = new GetTraceUseCase(repositorio);
  });

  describe('traza existente', () => {
    it('la busca por su identificador de correlación', async () => {
      repositorio.encontrado = { traza, spans: [] };

      await casoDeUso.execute('corr-1');

      expect(repositorio.consultas).toEqual(['corr-1']);
    });

    it('devuelve la traza aunque no tenga ningún paso', async () => {
      repositorio.encontrado = { traza, spans: [] };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.traza).toBe(traza);
      expect(resultado.pasos).toEqual([]);
    });
  });

  describe('traza inexistente', () => {
    it('responde 404', async () => {
      repositorio.encontrado = null;

      await expect(casoDeUso.execute('corr-que-no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('dice en el mensaje qué correlación se buscó', async () => {
      repositorio.encontrado = null;

      await expect(casoDeUso.execute('corr-9')).rejects.toThrow(/corr-9/);
    });
  });

  describe('árbol de pasos', () => {
    it('deja en la raíz el paso que no tiene padre', async () => {
      repositorio.encontrado = {
        traza,
        spans: [span('raiz', null, 'petición')],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos).toHaveLength(1);
      expect(resultado.pasos[0].id_span).toBe('raiz');
      expect(resultado.pasos[0].hijos).toEqual([]);
    });

    it('anida los hijos bajo su padre y conserva su identificador', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          span('raiz', null, 'petición'),
          span('hijo', 'raiz', 'consultar evento'),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos).toHaveLength(1);
      expect(resultado.pasos[0].hijos).toHaveLength(1);

      const hijo = resultado.pasos[0].hijos[0];
      expect(hijo.id_span).toBe('hijo');
      expect(hijo.parent_id).toBe('raiz');
      expect(hijo.hijos).toEqual([]);
    });

    it('anida tres niveles sin aplanar el árbol', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          span('n1', null, 'uno'),
          span('n2', 'n1', 'dos'),
          span('n3', 'n2', 'tres'),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      const nivel3 = resultado.pasos[0].hijos[0].hijos[0];
      expect(nivel3.id_span).toBe('n3');
      expect(nivel3.hijos).toEqual([]);
    });

    it('sigue el orden de llegada de la base de datos y no reordena los hermanos', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          span('raiz', null, 'petición'),
          span('segundo', 'raiz', 'segundo'),
          span('primero', 'raiz', 'primero'),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos[0].hijos.map((h) => h.nombre)).toEqual([
        'segundo',
        'primero',
      ]);
    });

    it('trata como raíz un paso cuyo padre no está en la traza', async () => {
      repositorio.encontrado = {
        traza,
        spans: [span('huerfano', 'padre-de-otra-traza', 'consultar evento')],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos).toHaveLength(1);
      expect(resultado.pasos[0].id_span).toBe('huerfano');
      expect(resultado.pasos[0].hijos).toEqual([]);
    });

    it('no pierde ningún paso aunque el árbol esté roto', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          span('n1', null, 'uno'),
          span('huerfano', 'no-existe', 'huerfano'),
          span('n2', 'n1', 'dos'),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      const ids = [
        ...resultado.pasos.map((p) => p.id_span),
        ...resultado.pasos.flatMap((p) =>
          p.hijos.flatMap((h) => [h.id_span, ...h.hijos.map((n) => n.id_span)]),
        ),
      ];

      expect(ids.sort()).toEqual(['huerfano', 'n1', 'n2']);
    });

    it('no deja que dos pasos con el mismo padre se pisen al construirlos', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          span('raiz', null, 'petición'),
          span('hijo', 'raiz', 'validar token'),
          span('hijo', 'raiz', 'cargar perfil'),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos[0].hijos).toHaveLength(2);
    });

    it('lleva los atributos ya redactados sin volver a tocarlos', async () => {
      repositorio.encontrado = {
        traza,
        spans: [
          new Span(
            'raiz',
            'traza-1',
            'petición',
            TipoSpan.http,
            10,
            EstadoSpan.ok,
            new Date('2026-01-01T10:00:00.000Z'),
            null,
            { authorization: '[REDACTADO]' },
          ),
        ],
      };

      const resultado = await casoDeUso.execute('corr-1');

      expect(resultado.pasos[0].atributos).toEqual({
        authorization: '[REDACTADO]',
      });
    });
  });
});
