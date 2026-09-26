import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  contarPorSeveridad,
  evaluar,
  extraerHallazgos,
  renderizar,
} from './summarize.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const script = join(aqui, 'summarize.mjs');
const fixture = (nombre) => join(aqui, 'fixtures', nombre);

const cargar = (nombre) => JSON.parse(readFileSync(fixture(nombre), 'utf8'));

test('extrae vulnerabilidades del formato de dependencias de Snyk', () => {
  const resultado = extraerHallazgos(cargar('reporte-dependencias.json'));
  assert.equal(resultado.tipo, 'dependencias');
  assert.equal(resultado.hallazgos.length, 4);
  const [critica] = resultado.hallazgos;
  assert.equal(critica.id, 'SNYK-JS-SHARP-19653587');
  assert.equal(critica.severidad, 'critical');
  assert.equal(critica.paquete, 'sharp@0.35.1');
  assert.equal(critica.correccion, '0.35.4');
  assert.equal(critica.ruta, 'sharp@0.35.1');
});

test('acepta el formato issues.vulnerabilities', () => {
  const resultado = extraerHallazgos({
    ok: false,
    issues: { vulnerabilities: [{ id: 'SNKY', severity: 'high', title: 'x' }] },
  });
  assert.equal(resultado.tipo, 'dependencias');
  assert.equal(resultado.hallazgos.length, 1);
});

test('normaliza la severidad moderate a medium', () => {
  const resultado = extraerHallazgos({
    vulnerabilities: [{ id: 'A', severity: 'moderate' }],
  });
  assert.equal(resultado.hallazgos[0].severidad, 'medium');
});

test('extrae misconfiguraciones del formato IaC', () => {
  const resultado = extraerHallazgos(cargar('reporte-iac.json'));
  assert.equal(resultado.tipo, 'infraestructura');
  assert.equal(resultado.hallazgos.length, 2);
  const [hallazgo] = resultado.hallazgos;
  assert.equal(hallazgo.severidad, 'high');
  assert.equal(hallazgo.paquete, 'aws_s3_bucket.logs');
  assert.equal(hallazgo.titulo, 'Public bucket permits public access (misconfiguration)');
});

test('extrae hallazgos del formato de Snyk Code (runs)', () => {
  const resultado = extraerHallazgos(cargar('reporte-codigo.json'));
  assert.equal(resultado.tipo, 'codigo');
  assert.equal(resultado.hallazgos.length, 2);
  assert.equal(resultado.hallazgos[0].severidad, 'high');
  assert.equal(resultado.hallazgos[1].ruta, 'goblinhub-api/src/auth/jwt.strategy.ts');
});

test('devuelve null cuando el formato no es reconocido', () => {
  assert.equal(extraerHallazgos({}), null);
  assert.equal(extraerHallazgos({ ok: false, error: 'AUTHENTICATION_FAILED' }), null);
});

test('trata un reporte sin hallazgos como resultado vacío', () => {
  for (const reporte of [
    { ok: true, vulnerabilities: [] },
    { ok: true, issues: { vulnerabilities: [] } },
    { ok: true, issues: {} },
    { ok: true, runs: [] },
  ]) {
    const resultado = extraerHallazgos(reporte);
    assert.equal(resultado.hallazgos.length, 0);
    assert.equal(evaluar(resultado.hallazgos, 'critical').bloqueantes.length, 0);
  }
});

test('cuenta hallazgos por severidad', () => {
  const conteo = contarPorSeveridad([
    { severidad: 'critical' },
    { severidad: 'high' },
    { severidad: 'medium' },
    { severidad: 'desconocido' },
  ]);
  assert.equal(conteo.critical, 1);
  assert.equal(conteo.high, 1);
  assert.equal(conteo.medium, 1);
  assert.equal(conteo.desconocido, 1);
});

test('el umbral critical bloquea solo las criticas', () => {
  const { hallazgos } = extraerHallazgos(cargar('reporte-dependencias.json'));
  const { bloqueantes, informativas } = evaluar(hallazgos, 'critical');
  assert.equal(bloqueantes.length, 1);
  assert.equal(bloqueantes[0].id, 'SNYK-JS-SHARP-19653587');
  assert.equal(informativas, 3);
});

test('el umbral high bloquea criticas y altas', () => {
  const { hallazgos } = extraerHallazgos(cargar('reporte-dependencias.json'));
  const { bloqueantes } = evaluar(hallazgos, 'high');
  assert.deepEqual(
    bloqueantes.map((h) => h.severidad),
    ['critical', 'high'],
  );
});

test('renderiza una tabla markdown con el resultado', () => {
  const extraccion = extraerHallazgos(cargar('reporte-dependencias.json'));
  const { markdown } = renderizar(extraccion, 'critical', 'Dependencias — api');
  assert.match(markdown, /^## Dependencias — api/);
  assert.match(markdown, /\| critical \| 1 \|/);
  assert.match(
    markdown,
    /\[SNYK-JS-SHARP-19653587]\(https:\/\/security\.snyk\.io\/vuln\/SNYK-JS-SHARP-19653587\)/,
  );
});

test('renderiza sin hallazgos bloqueantes', () => {
  const extraccion = extraerHallazgos(cargar('reporte-codigo.json'));
  const { markdown } = renderizar(extraccion, 'critical', 'Snyk Code');
  assert.match(markdown, /sin hallazgos `>= critical`/);
});

test('CLI: sale con 1 cuando hay hallazgos bloqueantes', () => {
  const resultado = spawnSync(
    process.execPath,
    [script, fixture('reporte-dependencias.json'), '--gate', 'high', '--titulo', 'Dependencias'],
    { encoding: 'utf8' },
  );
  assert.equal(resultado.status, 1);
  assert.match(resultado.stdout, /2 hallazgo\(s\) en o por encima de `high`/);
});

test('CLI: sale con 0 cuando no hay hallazgos bloqueantes', () => {
  const resultado = spawnSync(
    process.execPath,
    [script, fixture('reporte-codigo.json'), '--gate', 'critical'],
    { encoding: 'utf8' },
  );
  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /sin hallazgos `>= critical`/);
});

test('CLI: sale con 2 ante un umbral invalido', () => {
  const resultado = spawnSync(
    process.execPath,
    [script, fixture('reporte-dependencias.json'), '--gate', 'critica'],
    { encoding: 'utf8' },
  );
  assert.equal(resultado.status, 2);
  assert.match(resultado.stderr, /Umbral de gate no reconocido/);
});

test('CLI: sale con 2 ante un reporte ilegible o unrecognized', () => {
  const inexistente = spawnSync(process.execPath, [script, 'no-existe.json'], {
    encoding: 'utf8',
  });
  assert.equal(inexistente.status, 2);

  const vacio = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(vacio.status, 2);
});

test('CLI: sale con 2 si --gate recibe un umbral no reconocido (no desactiva el gate en silencio)', () => {
  const resultado = spawnSync(
    process.execPath,
    [script, fixture('reporte-dependencias.json'), '--gate', 'sev-inventada'],
    { encoding: 'utf8' },
  );
  assert.equal(resultado.status, 2);
  assert.match(resultado.stderr, /Umbral de gate no reconocido/);
});
