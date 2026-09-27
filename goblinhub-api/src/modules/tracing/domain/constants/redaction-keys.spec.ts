import {
  CLAVES_CONSERVADAS,
  CLAVES_SENSIBLES,
  normalizarClave,
} from './redaction-keys';

describe('Constantes de redacción', () => {
  it('normaliza la clave quitando mayúsculas y separadores', () => {
    expect(normalizarClave('ACCESS_TOKEN')).toBe('accesstoken');
    expect(normalizarClave('access-token')).toBe('accesstoken');
    expect(normalizarClave('api.key')).toBe('apikey');
    expect(normalizarClave('ApiKey')).toBe('apikey');
  });

  it('declara el motivo de cada clave que se conserva a propósito', () => {
    for (const motivo of Object.values(CLAVES_CONSERVADAS)) {
      expect(motivo.length).toBeGreaterThan(0);
    }
  });

  it('no declara a la vez una clave como sensible y como conservada', () => {
    const conservadas = Object.keys(CLAVES_CONSERVADAS).map(normalizarClave);

    for (const sensible of CLAVES_SENSIBLES) {
      expect(conservadas).not.toContain(sensible);
    }
  });
});
