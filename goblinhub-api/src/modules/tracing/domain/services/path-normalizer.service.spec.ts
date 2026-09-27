import { PathNormalizerService } from './path-normalizer.service';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTRO_UUID = '660f8400-e29b-41d4-a716-446655440001';

describe('PathNormalizerService', () => {
  let servicio: PathNormalizerService;

  beforeEach(() => {
    servicio = new PathNormalizerService();
  });

  describe('lo que sí normaliza', () => {
    it('sustituye un UUID por :id', () => {
      expect(servicio.normalizar(`/events/${UUID}`)).toBe('/events/:id');
    });

    it('sustituye un segmento puramente numérico por :id', () => {
      expect(servicio.normalizar('/events/42/inscripciones')).toBe(
        '/events/:id/inscripciones',
      );
    });

    it('sustituye un entero de 32 dígitos sin guiones por :id', () => {
      const entero = '1'.repeat(32);

      expect(servicio.normalizar(`/productos/${entero}`)).toBe(
        '/productos/:id',
      );
    });

    it('no normaliza un hexadecimal de 32 caracteres, que no es un entero', () => {
      const hexadecimal = 'a'.repeat(32);

      expect(servicio.normalizar(`/productos/${hexadecimal}`)).toBe(
        `/productos/${hexadecimal}`,
      );
    });

    it('sustituye todos los identificadores de una ruta con varios', () => {
      const ruta = `/events/${UUID}/inscripciones/${OTRO_UUID}/productos/7`;

      expect(servicio.normalizar(ruta)).toBe(
        '/events/:id/inscripciones/:id/productos/:id',
      );
    });

    it('acepta el UUID en mayúsculas, porque las URL no distinguen', () => {
      expect(servicio.normalizar(`/events/${UUID.toUpperCase()}`)).toBe(
        '/events/:id',
      );
    });
  });

  describe('lo que NO normaliza', () => {
    it('deja intacta una ruta sin identificadores', () => {
      expect(servicio.normalizar('/events')).toBe('/events');
    });

    it('deja intacta la raíz', () => {
      expect(servicio.normalizar('/')).toBe('/');
    });

    it('conserva un segmento estático con letras y guiones', () => {
      expect(servicio.normalizar('/api/documentacion')).toBe(
        '/api/documentacion',
      );
    });

    it('no toca un texto que contiene dígitos pero no es un número', () => {
      expect(servicio.normalizar('/eventos/temporada-2024')).toBe(
        '/eventos/temporada-2024',
      );
    });

    it('no toca un segmento de 32 caracteres que parece un UUID pero no lo es', () => {
      // Mide 32 y lleva guiones, pero el último grupo es demasiado corto: no es
      // un UUID, y tampoco es numérico, así que es un literal de ruta.
      const casi = '550e8400-e29b-41d4-a716-44665544';
      expect(casi).toHaveLength(32);

      expect(servicio.normalizar(`/eventos/${casi}`)).toBe(`/eventos/${casi}`);
    });

    it('deja intacta una ruta ya parametrizada', () => {
      expect(servicio.normalizar('/events/:id')).toBe('/events/:id');
    });

    it('no duplica el marcador en una ruta ya parametrizada', () => {
      const resultado = servicio.normalizar('/events/:id');

      expect(resultado.match(/:id/g)).toHaveLength(1);
    });
  });

  describe('casos límite', () => {
    it('no normaliza un segmento vacío, para no producir dobles barras', () => {
      expect(servicio.normalizar('/events//42')).toBe('/events//:id');
    });

    it('conserva la barra final', () => {
      expect(servicio.normalizar('/events/')).toBe('/events/');
    });

    it('tolera una cadena vacía', () => {
      expect(servicio.normalizar('')).toBe('');
    });

    it('acota el resultado al ancho que admite la columna', () => {
      const ruta = `/${'a'.repeat(400)}/42`;

      expect(servicio.normalizar(ruta).length).toBeLessThanOrEqual(200);
    });

    it('el recorte conserva el comienzo de la ruta', () => {
      const ruta = `/${'a'.repeat(400)}/${UUID}`;

      const resultado = servicio.normalizar(ruta);

      expect(resultado.startsWith(`/${'a'.repeat(50)}`)).toBe(true);
    });

    it('el recorte nunca deja un identificador de recurso en la base de datos', () => {
      // Es la garantía que importa de FR-020, y se cumple tanto si la ruta
      // entra entera como si hay que recortarla.
      const ruta = `/${'a'.repeat(400)}/${UUID}`;

      expect(servicio.normalizar(ruta)).not.toContain(UUID);
    });

    it('una ruta larga con identificador al principio conserva su :id', () => {
      const ruta = `/events/${UUID}/${'a'.repeat(400)}`;

      const resultado = servicio.normalizar(ruta);

      expect(resultado).toBe(`/events/:id/${'a'.repeat(400)}`.slice(0, 200));
    });
  });

  describe('coherencia entre rutas', () => {
    it('colapsa en la misma fila dos recursos distintos', () => {
      // Este es el motivo de que exista: sin normalizar, cada recurso crearía
      // su propia ruta y dispersaría el índice.
      const primera = servicio.normalizar(`/events/${UUID}`);
      const segunda = servicio.normalizar(`/events/${OTRO_UUID}`);

      expect(primera).toBe(segunda);
    });
  });
});
