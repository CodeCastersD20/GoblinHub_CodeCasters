import { Logger } from '@nestjs/common';
import {
  DEPLOY_ENV_VAR,
  DEFAULT_DEPLOY_ENV,
  resolveDeployEnvironment,
} from '../../../metrics/domain/constants/deploy-environment';
import { esNivelTraza, type NivelTraza } from '../enums/nivel-traza.enum';

/**
 * Configuración de la trazabilidad. Cubre los tres elementos que el alcance de
 * #204 pide definir: el **nivel** a partir del cual se registra, la **retención**
 * y el **servicio** que da nombre a la columna por la que se filtra.
 *
 * Se lee de forma tolerante: un valor inválido cae al valor por defecto y se
 * avisa por log, pero nunca lanza. La instrumentación está en el camino caliente
 * de cada petición, y una variable mal puesta en el entorno no puede ser motivo
 * de que la API no arranque.
 */

export const TRAZAS_SERVICIO_VAR = 'TRAZAS_SERVICIO';
export const TRAZAS_NIVEL_MINIMO_VAR = 'TRAZAS_NIVEL_MINIMO';
export const TRAZAS_RETENCION_DIAS_VAR = 'TRAZAS_RETENCION_DIAS';

/** `@prisma/client` no está en el path de este módulo y no hace falta. */
export const CONFIGURACION_TRACING_POR_DEFECTO = {
  servicio: 'goblinhub-api',
  nivelMinimo: 'info' as NivelTraza,
  /** Días que se conservan las trazas antes de la purga. */
  retencionDias: 7,
  ambiente: DEFAULT_DEPLOY_ENV,
} as const;

export type ConfiguracionTracing = {
  servicio: string;
  nivelMinimo: NivelTraza;
  retencionDias: number;
  ambiente: string;
};

const logger = new Logger('TracingConfig');

const sinEspacios = (valor: string): string => valor.trim();

/** Escala de severidad, de menor a mayor. */
const NIVELES: readonly NivelTraza[] = ['info', 'warn', 'error'];

/**
 * Los tres valores se resuelven en una sola lectura para que el log de avisos no
 * se disperse en tres sitios y una prueba pueda inspeccionarla.
 */
export const resolverConfiguracionTracing = (
  entorno: NodeJS.ProcessEnv = process.env,
): ConfiguracionTracing => {
  const avisos: string[] = [];

  const servicioCrudo = sinEspacios(entorno[TRAZAS_SERVICIO_VAR] ?? '');
  const servicio = servicioCrudo === '' ? CONFIGURACION_TRACING_POR_DEFECTO.servicio : servicioCrudo;

  const nivelCrudo = sinEspacios(entorno[TRAZAS_NIVEL_MINIMO_VAR] ?? '').toLowerCase();
  let nivelMinimo = CONFIGURACION_TRACING_POR_DEFECTO.nivelMinimo;

  if (nivelCrudo !== '') {
    if (esNivelTraza(nivelCrudo)) {
      nivelMinimo = nivelCrudo;
    } else {
      avisos.push(
        `${TRAZAS_NIVEL_MINIMO_VAR} inválido: "${entorno[TRAZAS_NIVEL_MINIMO_VAR]}". ` +
          `Valores permitidos: info|warn|error. Se usa "${nivelMinimo}".`,
      );
    }
  }

  const retencionCruda = sinEspacios(entorno[TRAZAS_RETENCION_DIAS_VAR] ?? '');
  let retencionDias: number = CONFIGURACION_TRACING_POR_DEFECTO.retencionDias;

  if (retencionCruda !== '') {
    const numero = Number(retencionCruda);

    if (Number.isInteger(numero) && numero > 0) {
      retencionDias = numero;
    } else {
      avisos.push(
        `${TRAZAS_RETENCION_DIAS_VAR} inválido: "${entorno[TRAZAS_RETENCION_DIAS_VAR]}". ` +
          `Se usa "${retencionDias}".`,
      );
    }
  }

  // El validador de `DEPLOY_ENV` lanza ante un valor fuera de catálogo, y aquí se
  // traduce a un aviso. Se reutiliza su catálogo en lugar de copiarlo: si el
  // tablero de métricas y el visor de trazas aceptaran entornos distintos, un
  // filtro de uno no encontraría nada en el otro.
  let ambiente = CONFIGURACION_TRACING_POR_DEFECTO.ambiente;

  try {
    ambiente = resolveDeployEnvironment(entorno[DEPLOY_ENV_VAR]);
  } catch (error) {
    avisos.push(
      error instanceof Error
        ? error.message
        : `${DEPLOY_ENV_VAR} inválido. Se usa "${ambiente}".`,
    );
  }

  for (const aviso of avisos) {
    logger.warn(aviso);
  }

  return { servicio, nivelMinimo, retencionDias, ambiente };
};

/**
 * `true` cuando la traza supera el nivel mínimo y merece la pena guardarse.
 *
 * El nivel se compara por posición en la escala y no por igualdad: con el
 * mínimo en `warn` se guardan las de `warn` y las de `error`, que es lo que
 * significa «a partir de este nivel».
 */
export const superaElNivelMinimo = (
  nivel: NivelTraza,
  minimo: NivelTraza,
): boolean => NIVELES.indexOf(nivel) >= NIVELES.indexOf(minimo);

/** Momento a partir del cual una traza está vencida. */
export const fechaDeVencimiento = (
  retencionDias: number,
  ahora: Date,
): Date => new Date(ahora.getTime() - retencionDias * 24 * 60 * 60 * 1000);
