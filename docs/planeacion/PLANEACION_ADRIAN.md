# PR de planeación — Adrián Eduardo Santos Rosales (@AdrianS-127)

> **Rol en el equipo**: infraestructura (Docker/despliegue) y pruebas E2E de
> seguridad (bad path del login).

## 1. Ticket / Issue

- **Issue #158** — `[Test]: Pruebas E2E (Playwright) para el "bad path" del
  login` <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/158>
- **Issue #140** — `[Infra] Integrar Dockerfile, Health Check y Logs
  estructurados`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/140>
- **Issue #139** — `[Infra] Ocultar contraseña de Base de Datos en subprocesos
  de backup` <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/139>
- **Issue #157** — `[Docs] Actualizar documentación (seguimiento spec-kit e
  infraestructura como código)`
- **Issue #210** — Planeación SDD del módulo de métricas de monitoreo. Rama
  `docs/210-planeacion-sdd-metricas-monitoreo`, cierra con el PR de esta issue.
- **Issue #214** — `[Feature]: Implementar tablero y alertas de métricas`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/214>
  (depende de #210; se implementa desde `specs/005-modulo-metricas-monitoreo/`).

## 2. Código elaborado (documentación y markdowns)

- **PR #159** — Pruebas E2E del bad path del login (`goblinhub_web/e2e/login-bad-path.spec.ts`).
- **PR #144** — `Dockerfile` multi-stage (node:20-alpine), `HEALTHCHECK` contra
  `/health` y logs de acceso en JSON (estrategia de despliegue, sección 5).
- **PR #145** — `.pgpass` temporal para ocultar la contraseña en backup/restore.
- **PR #157** — Actualización de documentación SDD/spec-kit e infraestructura
  como código.
- **Planeación SDD del módulo de métricas** (este trabajo) — comparación de
  Nagios, Zabbix, Prometheus + Grafana y Datadog en
  `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md`, con selección de
  **Prometheus + Grafana + Alertmanager** justificada por costo, integración y
  alertas; y los artefactos `spec.md`, `plan.md` y `tasks.md` en
  `specs/005-modulo-metricas-monitoreo/`.

## 3. Uso

- `docker build` + `docker run` reproducen el backend; `HEALTHCHECK` valida el
  estado; los logs JSON alimentan la monitorización en Render.
- El bad path del login valida la UX de error de autenticación en CI.
- La planeación de métricas se recorre en este orden: primero la comparativa
  (§3 y §4) para ver por qué se descartó cada alternativa, después
  `specs/005-modulo-metricas-monitoreo/plan.md` §2 y §3 para el catálogo de
  métricas con umbral, unidad, fuente y acción, §4 para las reglas de alerta y
  §5–§6 para los canales de notificación y la separación por entorno. Las tareas
  de implementación están en `specs/005-modulo-metricas-monitoreo/tasks.md` y se
  ejecutan en la issue #214.