export const DEPLOY_ENVIRONMENTS = [
  'development',
  'staging',
  'production',
] as const;

export type DeployEnvironment = (typeof DEPLOY_ENVIRONMENTS)[number];

export const DEFAULT_DEPLOY_ENV: DeployEnvironment = 'development';

export const DEPLOY_ENV_VAR = 'DEPLOY_ENV';

/**
 * Resuelve el entorno de despliegue desde `DEPLOY_ENV`.
 *
 * El valor por defecto es `development` para que un entorno local sin variable
 * configure siga exponiendo métricas utilizables, pero cualquier valor fuera
 * del catálogo se rechaza de forma ruidosa: un `DEPLOY_ENV=prod` silencioso
 * rompería el filtro `deployment_environment` del tablero sin que nadie lo note
 * (FR-006 de `specs/005-modulo-metricas-monitoreo/spec.md`).
 */
export function resolveDeployEnvironment(
  value: string | undefined = process.env[DEPLOY_ENV_VAR],
): DeployEnvironment {
  if (!value || value.trim() === '') {
    return DEFAULT_DEPLOY_ENV;
  }

  const normalizado = value.trim().toLowerCase();

  const encontrado = DEPLOY_ENVIRONMENTS.find(
    (entorno) => entorno === normalizado,
  );

  if (!encontrado) {
    throw new Error(
      `${DEPLOY_ENV_VAR} inválido: "${value}". Valores permitidos: ${DEPLOY_ENVIRONMENTS.join(
        '|',
      )}`,
    );
  }

  return encontrado;
}
