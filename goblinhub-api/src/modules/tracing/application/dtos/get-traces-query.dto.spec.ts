import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetTracesQueryDto } from './get-traces-query.dto';

/**
 * Las mismas opciones que el `ValidationPipe` global de `main.ts`. Se repiten
 * aquí a propósito: si el pipe global cambiara, esta prueba dejaría de
 * comprobar lo que la API hace y empezaría a comprobar lo que la prueba dice.
 */
const OPCIONES_PIPE = {
  whitelist: true,
  forbidNonWhitelisted: true,
} as const;

const consultar = async (consulta: Record<string, unknown>) => {
  const dto = plainToInstance(GetTracesQueryDto, consulta);
  const errores = await validate(dto, OPCIONES_PIPE);

  return { dto, errores };
};

const mensajesDe = (errores: { constraints?: Record<string, string> }[]) =>
  errores.flatMap((e) => Object.values(e.constraints ?? {}));

/**
 * El mensaje de `whitelistValidation` lo genera class-validator en inglés y no
 * se puede reescribir por decorador, así que se comprueba la estructura del
 * error en lugar de su texto.
 */
const propertiesConWhitelist = (
  errores: {
    property: string;
    constraints?: Record<string, string>;
  }[],
) =>
  errores
    .filter((e) => e.constraints?.whitelistValidation !== undefined)
    .map((e) => e.property);

describe('GetTracesQueryDto', () => {
  describe('valores por defecto', () => {
    it('devuelve la primera página con cincuenta trazas y sin contar el total', async () => {
      const { dto, errores } = await consultar({});

      expect(errores).toEqual([]);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
      expect(dto.includeTotal).toBe(false);
    });
  });

  describe('parámetro desconocido', () => {
    it('lo rechaza en lugar de ignorarlo en silencio', async () => {
      const { errores } = await consultar({ page: '1', inventado: 'x' });

      expect(propertiesConWhitelist(errores)).toEqual(['inventado']);
    });

    it('rechaza uno desconocido aunque el resto sea válido', async () => {
      const { errores } = await consultar({ limit: '10', desconocido: '1' });

      expect(propertiesConWhitelist(errores)).toEqual(['desconocido']);
    });

    it('no marca los parámetros declarados como desconocidos', async () => {
      const { errores } = await consultar({
        page: '2',
        limit: '10',
        metodo: 'GET',
        ambiente: 'development',
      });

      expect(propertiesConWhitelist(errores)).toEqual([]);
    });
  });

  describe('limit', () => {
    it('acota por encima de doscientos en vez de rechazar', async () => {
      const { dto, errores } = await consultar({ limit: '5000' });

      expect(errores).toEqual([]);
      expect(dto.limit).toBe(200);
    });

    it('acota por debajo de uno en vez de rechazar', async () => {
      const { dto, errores } = await consultar({ limit: '0' });

      expect(errores).toEqual([]);
      expect(dto.limit).toBe(1);
    });

    it('acota un valor negativo sin dejar de ser un número', async () => {
      const { dto, errores } = await consultar({ limit: '-40' });

      expect(errores).toEqual([]);
      expect(dto.limit).toBe(1);
    });

    it('respeta un valor dentro del rango', async () => {
      const { dto, errores } = await consultar({ limit: '25' });

      expect(errores).toEqual([]);
      expect(dto.limit).toBe(25);
    });

    it('rechaza un valor que no es un número', async () => {
      const { errores } = await consultar({ limit: 'muchos' });

      expect(mensajesDe(errores)).toContain('limit debe ser un número entero');
    });
  });

  describe('page', () => {
    it('rechaza la página cero porque la primera es la uno', async () => {
      const { errores } = await consultar({ page: '0' });

      expect(mensajesDe(errores)).toContain('page debe ser mayor o igual a 1');
    });

    it('rechaza un valor que no es un número', async () => {
      const { errores } = await consultar({ page: 'primera' });

      expect(mensajesDe(errores)).toContain('page debe ser un número entero');
    });
  });

  describe('metodo', () => {
    it('normaliza el verbo a mayúsculas', async () => {
      const { dto, errores } = await consultar({ metodo: 'get' });

      expect(errores).toEqual([]);
      expect(dto.metodo).toBe('GET');
    });

    it('normaliza aunque venga con espacios alrededor', async () => {
      const { dto } = await consultar({ metodo: ' post ' });

      expect(dto.metodo).toBe('POST');
    });

    it('rechaza un verbo más largo que la columna', async () => {
      const { errores } = await consultar({ metodo: 'GETSTALLOOONG' });

      expect(mensajesDe(errores)).toContain(
        'metodo no debe ser más largo que 10 caracteres',
      );
    });
  });

  describe('ruta', () => {
    it('rechaza una ruta más larga que la columna', async () => {
      const { errores } = await consultar({ ruta: '/x'.repeat(150) });

      expect(mensajesDe(errores)).toContain(
        'ruta no debe ser más larga que 200 caracteres',
      );
    });
  });

  describe('estado', () => {
    it('rechaza un código por debajo de cien', async () => {
      const { errores } = await consultar({ estado: '99' });

      expect(mensajesDe(errores)).toContain(
        'estado debe ser mayor o igual a 100',
      );
    });

    it('rechaza un código por encima de quinientos noventa y nueve', async () => {
      const { errores } = await consultar({ estado: '600' });

      expect(mensajesDe(errores)).toContain(
        'estado debe ser menor o igual a 599',
      );
    });

    it('acepta un cuatrocientos porque un 401 es información de diagnóstico', async () => {
      const { dto, errores } = await consultar({ estado: '401' });

      expect(errores).toEqual([]);
      expect(dto.estado).toBe(401);
    });
  });

  describe('ambiente', () => {
    it('no rechaza un valor fuera del catálogo, porque debe devolver la lista vacía', async () => {
      const { dto, errores } = await consultar({ ambiente: 'produccion' });

      expect(errores).toEqual([]);
      expect(dto.ambiente).toBe('produccion');
    });
  });

  describe('servicio', () => {
    it('acepta el nombre del servicio que atendió la petición', async () => {
      const { errores, dto } = await consultar({ servicio: 'goblinhub-api' });

      expect(errores).toEqual([]);
      expect(dto.servicio).toBe('goblinhub-api');
    });

    it('rechaza un nombre más largo que la columna', async () => {
      const { errores } = await consultar({ servicio: 'a'.repeat(61) });

      expect(mensajesDe(errores)).toContain(
        'servicio no debe ser más largo que 60 caracteres',
      );
    });
  });

  describe('rango de fechas', () => {
    it('rechaza una fecha que no es ISO 8601', async () => {
      const { errores } = await consultar({ desde: 'ayer' });

      expect(mensajesDe(errores)).toContain(
        'desde debe ser una fecha ISO 8601',
      );
    });

    it('rechaza un hasta mal formado aunque el desde sea válido', async () => {
      const { errores } = await consultar({
        desde: '2026-01-01T00:00:00.000Z',
        hasta: 'manana',
      });

      expect(mensajesDe(errores)).toContain(
        'hasta debe ser una fecha ISO 8601',
      );
    });

    it('acepta un rango bien formado', async () => {
      const { errores } = await consultar({
        desde: '2026-01-01T00:00:00.000Z',
        hasta: '2026-01-31T23:59:59.000Z',
      });

      expect(errores).toEqual([]);
    });
  });

  describe('includeTotal', () => {
    it('interpreta la cadena "true" como verdadero', async () => {
      const { dto, errores } = await consultar({ includeTotal: 'true' });

      expect(errores).toEqual([]);
      expect(dto.includeTotal).toBe(true);
    });

    it('interpreta la cadena "false" como falso', async () => {
      const { dto, errores } = await consultar({ includeTotal: 'false' });

      expect(errores).toEqual([]);
      expect(dto.includeTotal).toBe(false);
    });

    it('rechaza un valor que no es booleano', async () => {
      const { errores } = await consultar({ includeTotal: 'quizá' });

      expect(mensajesDe(errores)).toContain(
        'includeTotal debe ser un valor booleano',
      );
    });
  });
});
