# PR de planeación — Erick Daniel Arvayo Aviles (@Ddarielz)

> **Rol en el equipo**: QA y mejora de pruebas automatizadas + documentación SDD.

## 1. Ticket / Issue

- **Issue #83** — `[Test]: Pruebas e2e`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/83>
  → Inicialización y estructuración de la suite de pruebas E2E y de integración
  (rama `test/83-pruebas-e2e`).
- **Issue #152** — `[Bug]: Reporte de error en test de Backend` (reporte y
  seguimiento del estado de la suite).
- **Issue #135** — `[BD] Crear índices concurrentes para optimizar queries`
  (PR #147, `perf(bd)`).

## 2. Código elaborado (documentación)

- **PR #153** — `docs(sdd): implementación piloto SDD backend y QA`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/153>
  Define los specs ejecutables de QA (Jest) y backend (Pilotos C/D del SDD).
- **PR #147** — `perf(bd): agregar índices concurrentes en llaves foráneas`
  → optimiza la capa de datos que las pruebas validad.

## 3. Uso

- La suite E2E se ejecuta con `npm run test:e2e` (`goblinhub_web/`) y las
  unitarias de backend con `npm run test:cov` (`goblinhub-api/`), ambas en los
  pipelines `web.yml`/`api.yml`.
- La spec de QA documenta qué contratos de API deben cumplirse antes de mergear
  a `develop`.