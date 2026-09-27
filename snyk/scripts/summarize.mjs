#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const ORDEN_SEVERIDAD = ['low', 'medium', 'high', 'critical'];

const PESO = { low: 1, medium: 2, high: 3, critical: 4 };

function normalizarSeveridad(valor) {
  const severidad = String(valor ?? '').toLowerCase();
  if (severidad === 'moderate' || severidad === 'medie') return 'medium';
  return ORDEN_SEVERIDAD.includes(severidad) ? severidad : 'desconocida';
}

function peso(severidad) {
  return PESO[normalizarSeveridad(severidad)] ?? 0;
}

function texto(valor) {
  return valor === undefined || valor === null ? '' : String(valor);
}

function escapar(valor) {
  return texto(valor).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function enlace(hallazgo) {
  if (hallazgo.url) return `[${escapar(hallazgo.id)}](${hallazgo.url})`;
  return escapar(hallazgo.id);
}

function desdeVulnerabilidad(vulnerabilidad) {
  const rutas = Array.isArray(vulnerabilidad.from) ? vulnerabilidad.from : [];
  const fixedIn = Array.isArray(vulnerabilidad.fixInfo?.fixedIn)
    ? vulnerabilidad.fixInfo.fixedIn.join(', ')
    : '';
  const paquete = [
    texto(vulnerabilidad.packageName || vulnerabilidad.name),
    texto(vulnerabilidad.version),
  ]
    .filter(Boolean)
    .join('@');
  const recurso =
    texto(vulnerabilidad.resource) ||
    texto(vulnerabilidad.resources?.[0]?.name) ||
    texto(vulnerabilidad.filePath) ||
    texto(rutas[rutas.length - 1]);
  const tipo = texto(vulnerabilidad.issueType);
  const titulo = texto(vulnerabilidad.title) || texto(vulnerabilidad.name);

  return {
    id: texto(vulnerabilidad.id) || 'desconocido',
    severidad: normalizarSeveridad(vulnerabilidad.severity),
    titulo: tipo ? `${titulo} (${tipo})` : titulo,
    paquete: paquete || recurso,
    ruta: recurso,
    correccion: fixedIn,
    url: /^SNYK-/.test(texto(vulnerabilidad.id))
      ? `https://security.snyk.io/vuln/${vulnerabilidad.id}`
      : '',
  };
}

function desdeRun(run) {
  const issueData = run.issueData ?? run.issue_data ?? {};
  const hechoIssueData = Array.isArray(run.facts)
    ? run.facts.find((facto) => String(facto?.type ?? '').includes('issueData'))
        ?.content ?? {}
    : {};
  const datos = { ...hechoIssueData, ...issueData };
  const nodos = Array.isArray(run.nodes) ? run.nodes : [];
  const archivo =
    datos.filename ??
    run.filePaths?.[0] ??
    nodos.find((nodo) => nodo?.filePath)?.filePath ??
    '';

  return {
    id: texto(datos.id || run.id) || 'desconocido',
    severidad: normalizarSeveridad(datos.severity),
    titulo: texto(datos.title || run.title),
    paquete: texto(datos.packageName),
    ruta: archivo,
    correccion: '',
    url: '',
  };
}

export function extraerHallazgos(reporte) {
  if (!reporte || typeof reporte !== 'object') return null;

  const vulnerabilidades = Array.isArray(reporte.vulnerabilities)
    ? reporte.vulnerabilities
    : Array.isArray(reporte.issues?.vulnerabilities)
      ? reporte.issues.vulnerabilities
      : null;

  if (vulnerabilidades) {
    const esInfraestructura = vulnerabilidades.some(
      (vulnerabilidad) => Boolean(vulnerabilidad?.issueType || vulnerabilidad?.resource),
    );
    return {
      tipo: esInfraestructura ? 'infraestructura' : 'dependencias',
      hallazgos: vulnerabilidades.map(desdeVulnerabilidad),
    };
  }

  if (reporte.issues && typeof reporte.issues === 'object') {
    return { tipo: 'dependencias', hallazgos: [] };
  }

  if (Array.isArray(reporte.runs)) {
    return { tipo: 'codigo', hallazgos: reporte.runs.map(desdeRun) };
  }

  return null;
}

export function contarPorSeveridad(hallazgos) {
  const conteo = { critical: 0, high: 0, medium: 0, low: 0, desconocido: 0 };
  for (const hallazgo of hallazgos) conteo[hallazgo.severidad] += 1;
  return conteo;
}

export function evaluar(hallazgos, umbral) {
  const limite = peso(umbral);
  const bloqueantes = hallazgos.filter((h) => peso(h.severidad) >= limite && limite > 0);
  return {
    bloqueantes: bloqueantes.sort((a, b) => peso(b.severidad) - peso(a.severidad)),
    informativas: hallazgos.length - bloqueantes.length,
  };
}

export function renderizar({ tipo, hallazgos }, umbral, titulo) {
  const { bloqueantes, informativas } = evaluar(hallazgos, umbral);
  const conteo = contarPorSeveridad(hallazgos);
  const lineas = [];

  lineas.push(`## ${titulo}`);
  lineas.push('');
  lineas.push(
    `Escaneo: **${tipo}** · Hallazgos: **${hallazgos.length}** · Umbral bloqueante: \`${umbral}\``,
  );
  lineas.push('');
  lineas.push('| Severidad | Total |');
  lineas.push('| --- | --- |');
  for (const severidad of [...ORDEN_SEVERIDAD].reverse()) {
    lineas.push(`| ${severidad} | ${conteo[severidad]} |`);
  }
  if (conteo.desconocido > 0) {
    lineas.push(`| desconocido | ${conteo.desconocido} |`);
  }
  lineas.push('');

  if (bloqueantes.length === 0) {
    lineas.push(
      `**Resultado:** sin hallazgos \`>= ${umbral}\`. ${
        informativas > 0
          ? `${informativas} hallazgo(s) por debajo del umbral quedan reportados y se atienden según el SLA de remediación.`
          : 'Sin observaciones.'
      }`,
    );
    return { markdown: `${lineas.join('\n')}\n`, bloqueantes, findings: hallazgos };
  }

  lineas.push(`**Resultado:** ${bloqueantes.length} hallazgo(s) en o por encima de \`${umbral}\` (bloqueante).`);
  lineas.push('');
  lineas.push('| Severidad | ID | Paquete / archivo | Hallazgo | Corrección |');
  lineas.push('| --- | --- | --- | --- | --- |');
  for (const hallazgo of bloqueantes.slice(0, 25)) {
    lineas.push(
      `| ${hallazgo.severidad} | ${enlace(hallazgo)} | ${escapar(hallazgo.paquete || hallazgo.ruta)} | ${escapar(hallazgo.titulo)} | ${escapar(hallazgo.correccion) || '—'} |`,
    );
  }
  if (bloqueantes.length > 25) {
    lineas.push('');
    lineas.push(`_… y ${bloqueantes.length - 25} más; consulta el artefacto \`snyk-*\` del job._`);
  }

  return { markdown: `${lineas.join('\n')}\n`, bloqueantes, findings: hallazgos };
}

function parsearArgumentos(argv) {
  const opciones = { archivo: null, umbral: 'critical', titulo: 'Snyk' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--gate' || arg === '--umbral') {
      opciones.umbral = normalizarSeveridad(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--gate=') || arg.startsWith('--umbral=')) {
      opciones.umbral = normalizarSeveridad(arg.split('=')[1]);
    } else if (arg === '--titulo') {
      opciones.titulo = argv[i + 1] ?? opciones.titulo;
      i += 1;
    } else if (arg.startsWith('--titulo=')) {
      opciones.titulo = arg.slice('--titulo='.length);
    } else if (!arg.startsWith('-') && !opciones.archivo) {
      opciones.archivo = arg;
    }
  }
  return opciones;
}

export function ejecutar(argv) {
  const opciones = parsearArgumentos(argv);
  if (!opciones.archivo) {
    process.stderr.write('uso: summarize.mjs <reporte.json> [--gate <severity>] [--titulo <texto>]\n');
    return 2;
  }

  if (!ORDEN_SEVERIDAD.includes(opciones.umbral)) {
    process.stderr.write(
      `Umbral de gate no reconocido (se esperaba: ${ORDEN_SEVERIDAD.join(', ')}).\n`,
    );
    return 2;
  }

  let reporte;
  try {
    reporte = JSON.parse(readFileSync(opciones.archivo, 'utf8'));
  } catch (error) {
    process.stderr.write(`No se pudo leer el reporte ${opciones.archivo}: ${error.message}\n`);
    return 2;
  }

  if (reporte && typeof reporte === 'object' && reporte.error && !reporte.vulnerabilities && !reporte.runs) {
    process.stderr.write(`Snyk devolvió un error: ${reporte.error}\n`);
    return 2;
  }

  const encontrado = extraerHallazgos(reporte);
  if (!encontrado) {
    process.stderr.write(
      `Formato de reporte no reconocido (se esperaba vulnerabilidades o runs). Revisa la versión de la CLI de Snyk.\n`,
    );
    return 2;
  }

  const { markdown, bloqueantes } = renderizar(encontrado, opciones.umbral, opciones.titulo);
  process.stdout.write(markdown);
  return bloqueantes.length > 0 ? 1 : 0;
}

const invocadoComoScript =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invocadoComoScript) {
  process.exit(ejecutar(process.argv.slice(2)));
}
