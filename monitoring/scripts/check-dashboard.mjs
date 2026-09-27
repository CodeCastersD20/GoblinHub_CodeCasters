#!/usr/bin/env node
/**
 * Valida el dashboard de Grafana sin necesidad de arrancarlo.
 *
 * Un tablero se puede aprovisionar con 26 paneles y que la mitad esté mal:
 * sin datasource, sin consultas, o apilados en la misma casilla. Grafana acepta
 * todo eso y el error aparece en pantalla, es decir, durante el incidente.
 *
 * Comprobaciones:
 *   - JSON válido.
 *   - Sin `id` duplicado (Grafana sobrescribe el panel en lugar de fallar).
 *   - `gridPos` presente y sin solapes: dos paneles en la misma posición se
 *     tapan y el que queda debajo parece un fallo de datos.
 *   - Cada panel con datasource y con al menos una consulta.
 *
 * Uso: node monitoring/scripts/check-dashboard.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLERO = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'grafana',
  'dashboards',
  'goblinhub-overview.json',
);

const problems = [];
const tablero = JSON.parse(readFileSync(TABLERO, 'utf8'));
const paneles = tablero.panels ?? [];

// ── ids únicos ──────────────────────────────────────────────────────────────
const ids = paneles.map((panel) => panel.id);
const duplicados = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (duplicados.length > 0) {
  problems.push(`paneles con id duplicado: ${duplicados.join(', ')}`);
}

// ── solapes de gridPos ──────────────────────────────────────────────────────
/** Dos rectángulos se solapan si comparten alguna casilla de la rejilla. */
function seSolapan(a, b) {
  return (
    a.x < b.x + b.w &&
    b.x < a.x + a.w &&
    a.y < b.y + b.h &&
    b.y < a.y + a.h
  );
}

for (let i = 0; i < paneles.length; i += 1) {
  const panel = paneles[i];
  if (!panel.gridPos) {
    problems.push(`panel "${panel.title}": sin gridPos`);
    continue;
  }
  for (let j = i + 1; j < paneles.length; j += 1) {
    const otro = paneles[j];
    if (!otro.gridPos) {
      continue;
    }
    if (seSolapan(panel.gridPos, otro.gridPos)) {
      problems.push(
        `paneles "${panel.title}" y "${otro.title}" se solapan en ` +
          `x=${panel.gridPos.x} y=${panel.gridPos.y}`,
      );
    }
  }
}

// ── datasource y consultas ──────────────────────────────────────────────────
for (const panel of paneles) {
  if (panel.type === 'row') {
    continue;
  }
  if (!panel.datasource?.uid) {
    problems.push(`panel "${panel.title}": sin datasource`);
    continue;
  }
  const objetivos = panel.targets ?? [];
  if (objetivos.length === 0) {
    problems.push(`panel "${panel.title}": sin objetivos`);
  }
  for (const objetivo of objetivos) {
    if (!objetivo.expr && !objetivo.rawSql) {
      problems.push(
        `panel "${panel.title}": objetivo ${objetivo.refId} sin expr ni rawSql`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error('✖ El dashboard tiene problemas:');
  for (const problema of problems) {
    console.error(`  - ${problema}`);
  }
  process.exit(1);
}

console.log(
  `✓ Dashboard válido: ${paneles.length} paneles, ` +
    `${paneles.filter((p) => p.type === 'row').length} filas, ` +
    'sin ids duplicados ni solapes.',
);
