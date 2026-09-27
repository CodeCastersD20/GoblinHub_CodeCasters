#!/usr/bin/env node
/**
 * Comprueba que las reglas y el tablero solo usen métricas que la API publica.
 *
 * Por qué hace falta: una regla que referencia una métrica inexistente no
 * falla. Prometheus la evalúa a `NaN` o a vector vacío, la alerta se queda
 * `inactive`, `promtool check rules` dice SUCCESS y `health` dice `ok`. El
 * único síntoma es que la alerta no dispara nunca, y aparece la noche de un
 * incidente en la que hacía falta.
 *
 * Se cruzaron las tres cosas que tienen que coincidir:
 *   1. `NOMBRES_METRICAS` en el backend (lo que se registra).
 *   2. Las expresiones de `monitoring/prometheus/rules/goblinhub.yml`.
 *   3. Los `expr` del tablero en `monitoring/grafana/dashboards/`.
 *
 * Uso: node monitoring/scripts/check-contract-metricas.mjs
 * Sale con código 1 si hay referencias a métricas que nadie publica.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BACKEND = join(RAIZ, 'goblinhub-api', 'src', 'modules', 'metrics');
const ENTIDAD = join(BACKEND, 'domain', 'entities', 'metric-set.entity.ts');

/** Extrae los valores del objeto `NOMBRES_METRICAS` del backend. */
function metricasDelBackend() {
  if (!existsSync(ENTIDAD)) {
    console.error(`✖ No se encuentra ${ENTIDAD}`);
    process.exit(1);
  }
  const fuente = readFileSync(ENTIDAD, 'utf8');
  const bloque = fuente.match(/NOMBRES_METRICAS\s*=\s*{([\s\S]*?)}\s*as const/);
  if (!bloque) {
    console.error('✖ No se encontró el objeto NOMBRES_METRICAS en el backend');
    process.exit(1);
  }
  return [...bloque[1].matchAll(/:\s*'([a-z_][a-z0-9_]*)'/g)].map((m) => m[1]);
}

/** Nombres legítimos que no se registran en `NOMBRES_METRICAS`. */
function metricasExternas() {
  // Métricas por defecto de prom-client (`collectDefaultMetrics`).
  const promClient = [
    'process_resident_memory_bytes',
    'process_cpu_seconds_total',
    'process_start_time_seconds',
    'nodejs_eventloop_lag_seconds',
    'nodejs_eventloop_lag_p99_seconds',
    'nodejs_active_handles_total',
    'nodejs_heap_size_used_bytes',
    'nodejs_heap_size_total_bytes',
    'nodejs_external_memory_bytes',
  ];
  // Métricas del scrape de Prometheus, node_exporter y el propio servidor.
  const infraestructura = [
    'up',
    'scrape_samples_scraped',
    'scrape_duration_seconds',
    'node_filesystem_avail_bytes',
    'node_filesystem_size_bytes',
    'ALERTS',
  ];
  return new Set([...promClient, ...infraestructura]);
}

/** Nombres de métrica citados en un fichero PromQL. */
function metricasCitadas(texto) {
  const citadas = new Set();
  // Nombres con sufijo de serie temporal.
  for (const coincidencia of texto.matchAll(
    /\b((?:goblinhub|process|nodejs|node)_[a-z0-9_]+)\b/g,
  )) {
    const nombre = coincidencia[1];
    // Descarta palabras que comparten prefijo pero no son métricas.
    if (/_(bucket|sum|count|total|bytes|seconds|created|guests|info)$/.test(nombre) ||
        /^goblinhub_[a-z0-9_]+$/.test(nombre)) {
      citadas.add(nombre);
    }
  }
  return [...citadas];
}

/** Quita sufijos derivados para comparar contra el nombre registrado. */
function nombreBase(nombre) {
  return nombre.replace(/_(bucket|sum|count|total)$/, '');
}

function recogerFicheros(directorio, extensiones) {
  if (!existsSync(directorio)) {
    return [];
  }
  const encontrados = [];
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...recogerFicheros(ruta, extensiones));
    } else if (extensiones.some((extension) => entrada.name.endsWith(extension))) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

const publicadas = new Set(metricasDelBackend());
const conocidas = new Set([...publicadas, ...metricasExternas()]);

const ficheros = [
  ...recogerFicheros(join(RAIZ, 'monitoring', 'prometheus'), ['.yml', '.template']),
  ...recogerFicheros(join(RAIZ, 'monitoring', 'grafana', 'dashboards'), ['.json']),
].filter((ruta) => !ruta.endsWith('alertmanager.yml'));

const desconocidas = new Map();
for (const ruta of ficheros) {
  const texto = readFileSync(ruta, 'utf8');
  for (const nombre of metricasCitadas(texto)) {
    if (!conocidas.has(nombre) && !conocidas.has(nombreBase(nombre))) {
      const lista = desconocidas.get(nombre) ?? [];
      lista.push(ruta.replace(`${RAIZ}/`, ''));
      desconocidas.set(nombre, lista);
    }
  }
}

console.log(`Métricas registradas por el backend: ${publicadas.size}`);
console.log(`  ${[...publicadas].join('\n  ')}`);
console.log(`Ficheros de monitoreo revisados: ${ficheros.length}`);

if (desconocidas.size > 0) {
  console.error(
    '\n✖ Estas métricas se usan en las reglas o el tablero pero nadie las publica:',
  );
  for (const [nombre, rutas] of desconocidas) {
    console.error(`  - ${nombre} (en ${rutas.join(', ')})`);
  }
  process.exit(1);
}

// ── Etiquetas que `up` no puede tener ────────────────────────────────────────
// `up` la sintetiza Prometheus y solo lleva las etiquetas configuradas en el
// target, nunca las que devuelve la API. Una regla del tipo
// `up{deployment_environment="production"} == 0` no falla: no coincide con
// ninguna serie, la alerta se queda inactiva para siempre y `health` dice
// `ok`. A-09 llevaba así desde que se escribió, y el test de reglas lo tapaba
// porque usaba como entrada una serie que el Prometheus real nunca produce.
const plantilla = join(RAIZ, 'monitoring', 'prometheus', 'prometheus.yml.template');
const configuracion = readFileSync(plantilla, 'utf8');
const jobApi = configuracion.match(
  /- job_name:\s*goblinhub-api([\s\S]*?)(?=\n  - job_name:|\nmetrics_path|\Z)/,
);

if (!jobApi) {
  console.error('\n✖ No se encontró el job `goblinhub-api` en prometheus.yml.template');
  process.exit(1);
}

const bloque = jobApi[1];
// Se descartan las líneas comentadas: la plantilla explica el porqué de
// `honor_labels` y menciona el valor en prosa, así que buscar el ajuste en el
// texto plano daría un falso positivo (y un falso negativo si el valor real
// cambiase).
const ajustes = bloque
  .split('\n')
  .filter((linea) => !linea.trimStart().startsWith('#'))
  .join('\n');
const reglasUsanEntorno = /up\{[^}]*deployment_environment/.test(
  readFileSync(join(RAIZ, 'monitoring', 'prometheus', 'rules', 'goblinhub.yml'), 'utf8'),
);

if (reglasUsanEntorno) {
  const problems = [];
  if (!/honor_labels:\s*true/.test(ajustes)) {
    problems.push(
      'las reglas filtran `up` por `deployment_environment` pero el job ' +
        '`goblinhub-api` no tiene `honor_labels: true`. Sin esa opción, la ' +
        'etiqueta de la API se renombra a `exported_deployment_environment` ' +
        'y las alertas A-01..A-14 no encuentran series.',
    );
  }
  if (!/deployment_environment:\s*\{\{DEPLOY_ENV\}\}/.test(ajustes)) {
    problems.push(
      'las reglas filtran `up` por `deployment_environment` pero el job ' +
        '`goblinhub-api` no declara la etiqueta estática. `up` no la hereda ' +
        'de la API, así que A-09 y A-14 no pueden dispararse.',
    );
  }
  if (problems.length > 0) {
    console.error('\n✖ Configuración de scrape incoherente con las reglas:');
    for (const problema of problems) {
      console.error(`  - ${problema}`);
    }
    process.exit(1);
  }
  console.log('✓ El job `goblinhub-api` puede producir las etiquetas que filtran las reglas.');
}

console.log('✓ Todas las métricas usadas están publicadas o son estándar.');
