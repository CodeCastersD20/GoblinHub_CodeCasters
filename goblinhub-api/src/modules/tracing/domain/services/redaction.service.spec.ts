import { RedactionService } from './redaction.service';

/**
 * El servicio devuelve JSON, que también admite `null` y arreglos. En las
 * pruebas siempre comparamos contra un objeto, así que se estrecha el tipo una
 * sola vez en lugar de repetir el cast en cada aserción.
 */
const comoObjeto = (resultado: unknown): Record<string, unknown> =>
  resultado as Record<string, unknown>;

describe('RedactionService', () => {
  let servicio: RedactionService;

  beforeEach(() => {
    servicio = new RedactionService();
  });

  describe('enmascarado por nombre de clave', () => {
    it.each([
      ['password', 'mi contraseña'],
      ['passwordHash', 'hash de la contraseña'],
      ['access_token', 'token de acceso'],
      ['refreshToken', 'token de renovación'],
      ['Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.cuerpo.firma'],
      ['apiKey', 'clave de la API'],
      ['SUPABASE_SERVICE_KEY', 'clave de servicio'],
      ['clientSecret', 'secreto del cliente'],
    ])('enmascara el valor de %s conservando la clave', (clave, valor) => {
      const resultado = comoObjeto(servicio.redactar({ [clave]: valor }));

      expect(resultado[clave]).toBe('[REDACTADO]');
      expect(Object.keys(resultado)).toContain(clave);
      expect(JSON.stringify(resultado)).not.toContain(valor);
    });

    it('normaliza la clave, así que access_token y accessToken caen igual', () => {
      const resultado = comoObjeto(
        servicio.redactar({
          access_token: 'uno',
          'access-token': 'dos',
          AccessToken: 'tres',
        }),
      );

      expect(resultado['access_token']).toBe('[REDACTADO]');
      expect(resultado['access-token']).toBe('[REDACTADO]');
      expect(resultado['AccessToken']).toBe('[REDACTADO]');
    });
  });

  describe('truncado por longitud', () => {
    it('recorta un texto que supera la longitud máxima y deja constancia', () => {
      const largo = 'a'.repeat(600);
      const mensaje = comoObjeto(servicio.redactar({ mensaje: largo }))[
        'mensaje'
      ] as string;

      expect(mensaje.length).toBeLessThan(largo.length);
      expect(mensaje).toContain('[TRUNCADO]');
    });

    it('no toca un texto que cabe en la longitud máxima', () => {
      const corto = 'a'.repeat(100);
      const mensaje = comoObjeto(servicio.redactar({ mensaje: corto }))[
        'mensaje'
      ] as string;

      expect(mensaje).toBe(corto);
      expect(mensaje).not.toContain('[TRUNCADO]');
    });

    it('deja intactos los números y los booleanos', () => {
      expect(servicio.redactar({ numero: 42, activo: true })).toEqual({
        numero: 42,
        activo: true,
      });
    });
  });

  describe('anidación', () => {
    it('enmascara dentro de un objeto anidado', () => {
      const resultado = servicio.redactar({
        usuario: { nombre: 'Ada', password: 'secreta' },
      });

      expect(resultado).toEqual({
        usuario: { nombre: 'Ada', password: '[REDACTADO]' },
      });
    });

    it('enmascara dentro de un arreglo de objetos', () => {
      const resultado = servicio.redactar({
        llamadas: [{ token: 'a' }, { token: 'b' }],
      });

      expect(resultado).toEqual({
        llamadas: [{ token: '[REDACTADO]' }, { token: '[REDACTADO]' }],
      });
    });

    it('enmascara a cualquier profundidad', () => {
      const resultado = servicio.redactar({
        a: { b: { c: { d: [{ secret: 'profundo' }] } } },
      });

      expect(resultado).toEqual({
        a: { b: { c: { d: [{ secret: '[REDACTADO]' }] } } },
      });
    });

    it('enmascara un arreglo de valores sueltos conservando su posición', () => {
      const resultado = servicio.redactar({ errores: ['uno', 'dos'] });

      expect(resultado).toEqual({ errores: ['uno', 'dos'] });
    });
  });

  describe('claves que se guardan a propósito', () => {
    it('conserva el identificador de usuario, que es dato de auditoría', () => {
      expect(servicio.redactar({ id_usuario: 'uuid-del-admin' })).toEqual({
        id_usuario: 'uuid-del-admin',
      });
    });

    it('conserva la correlación, que no es un secreto', () => {
      expect(servicio.redactar({ correlationId: 'abc-123' })).toEqual({
        correlationId: 'abc-123',
      });
    });

    it('conserva una clave cuyo nombre contiene "key" sin ser sensible', () => {
      expect(servicio.redactar({ idClave: 'pais' })).toEqual({
        idClave: 'pais',
      });
    });
  });

  describe('puro', () => {
    it('no muta el objeto recibido', () => {
      const original = {
        password: 'secreta',
        usuario: { token: 'oculto' },
        lista: [{ secret: 'x' }],
      };

      servicio.redactar(original);

      expect(original).toEqual({
        password: 'secreta',
        usuario: { token: 'oculto' },
        lista: [{ secret: 'x' }],
      });
    });

    it('devuelve un objeto nuevo, no la misma referencia', () => {
      const original = { password: 'secreta' };

      expect(servicio.redactar(original)).not.toBe(original);
    });
  });
});
