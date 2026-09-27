#!/usr/bin/env node
/**
 * Genera `prometheus.yml` y `alertmanager.yml` a partir de `.env`.
 *
 * ¿Por qué un generador propio y no `envsubst`? Prometheus no interpola
 * variables de entorno en su fichero de configuración, y la imagen oficial no
 * trae `envsubst` instalado. La alternativa habitual falla en el momento menos
 * apropiado: el arranque. Este script hace lo mismo con Node, que el proyecto
 * ya tiene, y añade la validación que `envsubst` no hace: si falta una
 * variable obligatoria, sale con código distinto de cero y CI se entera
 * (FR-020, FR-023).
 *
 * Uso:
 *   node scripts/generate-config.mjs            # lee .env del directorio
 *   node scripts/generate-config.mjs --check    # valida sin escribir
 *
 * Los ficheros generados quedan fuera de git cuando contienen credenciales
 * (ver `.gitignore`): el repositorio guarda las plantillas, no los secretos.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLANTILLAS = [
  { nombre: 'prometheus.yml', archivo: 'prometheus/prometheus.yml.template' },
  { nombre: 'alertmanager.yml', archivo: 'alertmanager/alertmanager.yml.template' },
];

const OBLIGATORIAS = [
  'DEPLOY_ENV',
  'API_TARGET',
  'GRAFANA_ADMIN_USER',
  'GRAFANA_ADMIN_PASSWORD',
];

const ENTORNOS = ['development', 'staging', 'production'];
const SOLO_CHECK = process.argv.includes('--check');

/**
 * `--out DIRECTORIO` cambia el destino de la escritura. Lo usa el servicio
 * `config-init` de `docker-compose.yml`, que monta el repositorio en solo
 * lectura y necesita escribir en un volumen: los ficheros generados contienen
 * credenciales y no deben caer en el disco de trabajo.
 */
function directorioSalida() {
  const indice = process.argv.indexOf('--out');
  if (indice === -1) {
    return null;
  }
  const valor = process.argv[indice + 1];
  if (!valor) {
    console.error('✖ --out necesita un directorio');
    process.exit(1);
  }
  return valor;
}

const SALIDA = directorioSalida();

/** Lee `archivo=.env` y `export ARCHIVO=valor`. Sin dependencias externas. */
function leerEnv(ruta) {
  if (!existsSync(ruta)) {
    console.error(
      `✖ No existe ${ruta}. Copia .env.example a .env y rellena los valores.`,
    );
    process.exit(1);
  }

  const variables = {};
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (limpia === '' || limpia.startsWith('#')) {
      continue;
    }
    const separador = limpia.indexOf('=');
    if (separador === -1) {
      continue;
    }
    const clave = limpia.slice(0, separador).replace(/^export\s+/, '').trim();
    const valor = limpia
      .slice(separador + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    variables[clave] = valor;
  }
  return variables;
}

function fallar(mensajes) {
  console.error('✖ La configuración del stack de monitoreo está incompleta:');
  for (const mensaje of mensajes) {
    console.error(`  - ${mensaje}`);
  }
  process.exit(1);
}

function validar(variables) {
  const problemas = [];

  for (const clave of OBLIGATORIAS) {
    if (!variables[clave]) {
      problemas.push(`falta ${clave}`);
    }
  }

  if (
    variables.DEPLOY_ENV &&
    !ENTORNOS.includes(variables.DEPLOY_ENV)
  ) {
    problemas.push(
      `DEPLOY_ENV="${variables.DEPLOY_ENV}" no está en ${ENTORNOS.join('|')}`,
    );
  }

  if (variables.GRAFANA_ADMIN_PASSWORD === 'cambia-esta-contrasena') {
    problemas.push(
      'GRAFANA_ADMIN_PASSWORD sigue con el valor de ejemplo: cámbialo antes de exponer la UI',
    );
  }

  const canales = [
    'ALERTMANAGER_SMTP_HOST',
    'SLACK_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL',
    'ALERTMANAGER_MOCK_WEBHOOK_URL',
  ].filter((clave) => variables[clave]);

  if (canales.length === 0) {
    console.warn(
      '⚠ Ningún canal de notificación está configurado. Las alertas seguirán visibles ' +
        'en la UI de Alertmanager y en el tablero, pero nadie recibirá un aviso.',
    );
  }

  if (problemas.length > 0) {
    fallar(problemas);
  }

  return canales;
}

/**
 * Sustituye `{{VARIABLE}}` por su valor y resuelve los bloques
 * `{{#if VARIABLE}}…{{/if}}`, que solo se incluyen si la variable tiene valor.
 * El bloque es lo que permite que el `alertmanager.yml` generado omita un
 * receptor sin canal configurado: un `slack_configs` con webhook vacío hace
 * que Alertmanager falle al cargar la configuración, y ese fallo solo se
 * descubre al arrancar el contenedor.
 *
 * A diferencia de `envsubst`, una variable no definida en la plantilla se
 * detecta: se deja el marcador intacto para que `promtool check config` la
 * rechace en lugar de desplegar un Prometheus con un target vacío.
 */
function interpolar(plantilla, variables) {
  const conBloques = plantilla.replace(
    /\{\{#if ([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_marcador, clave, cuerpo) => {
      if (!(clave in variables)) {
        throw new Error(
          `La plantilla usa {{#if ${clave}}} y esa variable no existe en .env`,
        );
      }
      return variables[clave] === '' ? '' : cuerpo;
    },
  );

  return conBloques.replace(/\{\{([A-Z0-9_]+)\}\}/g, (marcador, clave) => {
    if (!(clave in variables)) {
      throw new Error(
        `La plantilla usa {{${clave}}} y esa variable no existe en .env`,
      );
    }
    return variables[clave];
  });
}

const variables = leerEnv(join(RAIZ, '.env'));
const canales = validar(variables);

for (const { nombre, archivo: plantilla } of PLANTILLAS) {
  const rutaPlantilla = join(RAIZ, plantilla);
  if (!existsSync(rutaPlantilla)) {
    console.error(`✖ Falta la plantilla ${rutaPlantilla}`);
    process.exit(1);
  }

  let generado;
  try {
    generado = interpolar(readFileSync(rutaPlantilla, 'utf8'), variables);
  } catch (error) {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  }

  if (SOLO_CHECK) {
    console.log(`✓ ${plantilla} se puede renderizar`);
    continue;
  }

  const rutaSalida = SALIDA
    ? join(SALIDA, nombre)
    : join(RAIZ, nombre === 'prometheus.yml' ? 'prometheus/prometheus.yml' : 'alertmanager/alertmanager.yml');
  const carpetaSalida = dirname(rutaSalida);
  mkdirSync(carpetaSalida, { recursive: true });
  writeFileSync(rutaSalida, generado);
  console.log(
    `✓ ${rutaSalida.replace(`${RAIZ}/`, '')} generado (${generado.split('\n').length} líneas)`,
  );
}

if (SOLO_CHECK) {
  console.log(
    `✓ Configuración válida. Canales de notificación: ${canales.join(', ') || 'ninguno'}`,
  );
}
