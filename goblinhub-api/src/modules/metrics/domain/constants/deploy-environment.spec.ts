import { resolveDeployEnvironment } from './deploy-environment';

describe('resolveDeployEnvironment', () => {
  const original = process.env.DEPLOY_ENV;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEPLOY_ENV;
    } else {
      process.env.DEPLOY_ENV = original;
    }
  });

  it('usa development cuando la variable no está definida', () => {
    delete process.env.DEPLOY_ENV;

    expect(resolveDeployEnvironment()).toBe('development');
    expect(resolveDeployEnvironment('')).toBe('development');
    expect(resolveDeployEnvironment('   ')).toBe('development');
  });

  it('acepta los tres entornos del catálogo', () => {
    expect(resolveDeployEnvironment('development')).toBe('development');
    expect(resolveDeployEnvironment('staging')).toBe('staging');
    expect(resolveDeployEnvironment('production')).toBe('production');
  });

  it('normaliza mayúsculas y espacios', () => {
    expect(resolveDeployEnvironment(' Production ')).toBe('production');
    expect(resolveDeployEnvironment('STAGING')).toBe('staging');
  });

  it('rechaza un valor fuera del catálogo en lugar de etiquetar en silencio', () => {
    expect(() => resolveDeployEnvironment('prod')).toThrow(
      /DEPLOY_ENV inválido/,
    );
    expect(() => resolveDeployEnvironment('qa')).toThrow(
      /development\|staging\|production/,
    );
  });

  it('lee la variable DEPLOY_ENV del entorno cuando no se pasa argumento', () => {
    process.env.DEPLOY_ENV = 'staging';

    expect(resolveDeployEnvironment()).toBe('staging');
  });
});
