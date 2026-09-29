import {
  CONFIGURACION_TRACING_POR_DEFECTO,
  fechaDeVencimiento,
  resolverConfiguracionTracing,
  superaElNivelMinimo,
  TRAZAS_NIVEL_MINIMO_VAR,
  TRAZAS_RETENCION_DIAS_VAR,
  TRAZAS_SERVICIO_VAR,
} from './tracing-config';

/**
 * `resolverConfiguracionTracing` recibe el entorno como parámetro justamente para
 * que estas pruebas no dependan de las variables de quien las ejecuta. El
 * mínimo imprescindible es que la trazabilidad arranque con valores utilizables
 * sin configurar nada.
 */
describe('resolverConfiguracionTracing', () => {
  describe('valores por defecto', () => {
    it('usa valores seguros cuando no hay ninguna variable definida', () => {
      expect(resolverConfiguracionTracing({})).toEqual(
        CONFIGURACION_TRACING_POR_DEFECTO,
      );
    });

    it('ignora una variable presente pero vacía', () => {
      const configuracion = resolverConfiguracionTracing({
        [TRAZAS_SERVICIO_VAR]: '   ',
        [TRAZAS_NIVEL_MINIMO_VAR]: '',
        [TRAZAS_RETENCION_DIAS_VAR]: '',
      });

      expect(configuracion.servicio).toBe(
        CONFIGURACION_TRACING_POR_DEFECTO.servicio,
      );
      expect(configuracion.nivelMinimo).toBe('info');
      expect(configuracion.retencionDias).toBe(7);
    });
  });

  describe('servicio', () => {
    it('toma el valor de la variable', () => {
      const configuracion = resolverConfiguracionTracing({
        [TRAZAS_SERVICIO_VAR]: 'pasarela-pagos',
      });

      expect(configuracion.servicio).toBe('pasarela-pagos');
    });

    it('recorta los espacios que pueden venir en un archivo de entorno', () => {
      const configuracion = resolverConfiguracionTracing({
        [TRAZAS_SERVICIO_VAR]: '  api  ',
      });

      expect(configuracion.servicio).toBe('api');
    });
  });

  describe('nivel mínimo', () => {
    it.each(['info', 'warn', 'error'] as const)('acepta el nivel %s', (nivel) => {
      const configuracion = resolverConfiguracionTracing({
        [TRAZAS_NIVEL_MINIMO_VAR]: nivel.toUpperCase(),
      });

      expect(configuracion.nivelMinimo).toBe(nivel);
    });

    it('cae al valor por defecto ante un nivel fuera de catálogo, sin lanzar', () => {
      // Un arranque bloqueado por una variable mal puesta dejaría la API sin
      // servir tráfico, que es un problema mayor que registrar trazas de más.
      const configurar = () =>
        resolverConfiguracionTracing({
          [TRAZAS_NIVEL_MINIMO_VAR]: 'depuracion',
        });

      expect(configurar).not.toThrow();
      expect(configurar().nivelMinimo).toBe('info');
    });
  });

  describe('retención', () => {
    it('toma el número de días de la variable', () => {
      const configuracion = resolverConfiguracionTracing({
        [TRAZAS_RETENCION_DIAS_VAR]: '30',
      });

      expect(configuracion.retencionDias).toBe(30);
    });

    it.each(['siete', '0', '-3', '1.5'])(
      'cae al valor por defecto con el valor %s, sin lanzar',
      (valor) => {
        const configurar = () =>
          resolverConfiguracionTracing({
            [TRAZAS_RETENCION_DIAS_VAR]: valor,
          });

        expect(configurar).not.toThrow();
        expect(configurar().retencionDias).toBe(7);
      },
    );

    it('calcula el instante de vencimiento restando los días', () => {
      const ahora = new Date('2026-09-28T12:00:00.000Z');

      expect(fechaDeVencimiento(2, ahora).toISOString()).toBe(
        '2026-09-26T12:00:00.000Z',
      );
    });
  });

  describe('entorno de despliegue', () => {
    it('toma el valor de DEPLOY_ENV', () => {
      const configuracion = resolverConfiguracionTracing({
        DEPLOY_ENV: 'production',
      });

      expect(configuracion.ambiente).toBe('production');
    });

    it('cae al valor por defecto ante un entorno fuera de catálogo, sin lanzar', () => {
      const configurar = () =>
        resolverConfiguracionTracing({ DEPLOY_ENV: 'prod' });

      expect(configurar).not.toThrow();
      expect(configurar().ambiente).toBe('development');
    });
  });
});

describe('superaElNivelMinimo', () => {
  it('con el mínimo en info guarda los tres niveles', () => {
    expect(superaElNivelMinimo('info', 'info')).toBe(true);
    expect(superaElNivelMinimo('warn', 'info')).toBe(true);
    expect(superaElNivelMinimo('error', 'info')).toBe(true);
  });

  it('con el mínimo en warn descarta info y guarda warn y error', () => {
    expect(superaElNivelMinimo('info', 'warn')).toBe(false);
    expect(superaElNivelMinimo('warn', 'warn')).toBe(true);
    expect(superaElNivelMinimo('error', 'warn')).toBe(true);
  });

  it('con el mínimo en error solo guarda error', () => {
    expect(superaElNivelMinimo('info', 'error')).toBe(false);
    expect(superaElNivelMinimo('warn', 'error')).toBe(false);
    expect(superaElNivelMinimo('error', 'error')).toBe(true);
  });
});
