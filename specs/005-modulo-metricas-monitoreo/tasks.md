# Tasks: Módulo de métricas de monitoreo (Prometheus + Grafana + Alertmanager)

**Input**: Design documents from `/specs/005-modulo-metricas-monitoreo/`

**Convención**: cada tarea declara el requisito (`FR-xxx`) de
`specs/005-modulo-metricas-monitoreo/spec.md` que satisface y la sección de
`plan.md` donde está diseñada. Tareas `P` = rutas críticas de la implementación.

> **Alcance de este fichero**: la **Phase 0** se completa en el PR de #210
> (planeación). Las **Phases 1 a 5** se implementan en el PR de #214. Así queda
> el desglose ejecutable sin adelantar en este PR código que la issue #214
> todavía no reclama.

---

## Phase 0: Planeación SDD (este PR, issue #210)

- [x] T001 Comparar Nagios Core, Zabbix, Prometheus + Grafana y Datadog con matriz ponderada de 6 criterios y veredicto por opción → `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md` (§3, §4)
- [x] T002 Justificar la selección por costo, integración, alertas y alarmas, incluyendo las alternativas descartadas y los riesgos asumidos → `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md` (§5, §6)
- [x] T003 Escribir el PR general de planeación SDD con la plantilla del repositorio y `Closes #210`
- [x] T004 Redactar `specs/005-modulo-metricas-monitoreo/spec.md` con las 7 user stories mapeadas a los criterios de #214 y de #210
- [x] T005 Redactar `specs/005-modulo-metricas-monitoreo/plan.md` con catálogos, reglas de alerta, routing, canales y matriz de trazabilidad
- [x] T006 Redactar estas tareas, cada una enlazada a su `FR` y a su sección del plan
- [x] T007 [P] Actualizar la trazabilidad: `specs/README.md`, `docs/sdd-implementation.md`, `docs/planeacion/PLANEACION_ADRIAN.md` y nota de cierre en `docs/BACKEND_REVIEW.md` §7.4/§7.8

**Checkpoint**: La herramienta está seleccionada, justificada y desglosada en tareas implementables. **Cierra #210.**

---

## Phase 1: Instrumentación del backend (P1) — US1, FR-001–FR-008

- [ ] T008 [P] Instalar `prom-client` y añadirlo a `goblinhub-api/package.json` (FR-001)
- [ ] T009 Crear `modules/metrics/domain/constants/metric-registry.ts` con el catálogo tipado de las 15 métricas técnicas de `plan.md` §2 (FR-001, FR-006)
- [ ] T010 Crear `modules/metrics/infrastructure/services/metrics.service.ts` con `collectDefaultMetrics()` y los contadores, histograma y medidores del registro (FR-001, FR-004)
- [ ] T011 Crear `modules/metrics/infrastructure/interceptors/metrics.interceptor.ts` para registrar latencia en histograma y estado en contador, usando la ruta con comodín para acotar cardinalidad (FR-002, FR-003)
- [ ] T012 Registrar el interceptor en `app.module.ts` como `APP_INTERCEPTOR`, después de `ActivityLogInterceptor` (FR-002)
- [ ] T013 Crear `modules/metrics/application/use-case/get-backup-freshness.use-case.ts` que expone la marca de tiempo del último backup exitoso (FR-005, `plan.md` M-12)
- [ ] T014 [P] Crear `modules/metrics/interfaces/controllers/metrics.controller.ts` con `GET /metrics`, `GET /healthz` y `GET /health/ready` (comprueba PostgreSQL) (FR-001, FR-007)
- [ ] T015 [P] Añadir la etiqueta constante `deployment_environment` desde la variable `DEPLOY_ENV` y validar su valor contra `development|staging|production` (FR-006)
- [ ] T016 Crear `modules/metrics/metrics.module.ts` y registrarlo en `app.module.ts` (FR-001)
- [ ] T017 Excluir `/metrics` y `/health/*` del middleware de redirección de `main.ts` y del CORS del navegador, sin tocar el resto del contrato (FR-008)
- [ ] T018 Escribir tests unitarios del interceptor y del servicio de métricas con Jest (Principios I y III)
- [ ] T019 [P] Añadir casos Supertest en `test/` para `/metrics` (200 y presencia de las 4 familias), `/healthz` y `/health/ready` (Principio V)
- [ ] T020 [P] Verificar que los endpoints de negocio no cambian de contrato: ejecutar `npm run api` y la suite e2e existentes (FR-008)

**Checkpoint**: `curl localhost:3000/metrics` devuelve las 4 familias técnicas y los health checks responden. *Cubre el AC «Se instrumentan disponibilidad, latencia, tasa de errores y recursos» de #214.*

---

## Phase 2: Stack de monitoreo (P1) — US2, FR-009, FR-010, FR-020

- [ ] T021 Crear `monitoring/docker-compose.yml` con Prometheus, Grafana y Alertmanager, siguiendo el patrón de `sonarqube/docker-compose.yml` (volúmenes, `restart`, healthchecks) (FR-020)
- [ ] T022 [P] Crear `monitoring/.env.example` con todas las variables documentadas y sin valores (FR-022)
- [ ] T023 Añadir `monitoring/.env` y los ficheros generados con credenciales a `.gitignore` (FR-021, Principio II)
- [ ] T024 Crear `monitoring/scripts/generate-config.mjs` que genera `prometheus.yml` y `alertmanager.yml` desde el `.env` y falla con código ≠ 0 si falta una variable obligatoria (FR-020, `plan.md` §7)
- [ ] T025 Crear `monitoring/prometheus/prometheus.yml.template` con un *job* por entorno, retención de 30 días y `node_exporter` (FR-020, `plan.md` §6)
- [ ] T026 Crear `monitoring/grafana/provisioning/datasources/datasources.yml` con el datasource Prometheus y el datasource PostgreSQL de solo lectura para las métricas de negocio (FR-019)
- [ ] T027 Crear `monitoring/grafana/provisioning/dashboards/dashboards.yml` para provisionar el tablero desde el repositorio (FR-011)
- [ ] T028 [P] Crear `monitoring/grafana/dashboards/goblinhub-overview.json` con los paneles de disponibilidad, latencia P50/P95/P99, tasa de error, throughput, CPU, memoria, event loop lag, pool de Prisma y backup (FR-009)
- [ ] T029 [P] Añadir al tablero la variable `$env` (`development|staging|production`) y filtrar por `deployment_environment` en **todas** las consultas (FR-010)
- [ ] T030 Añadir al tablero la sección de métricas de negocio (N-01 a N-08 de `plan.md` §3) con el datasource de solo lectura (FR-018, FR-019)
- [ ] T031 Crear `monitoring/README.md` con el comando de arranque, el catálogo de variables documentadas y cómo consultar cada panel (FR-020, FR-022)

**Checkpoint**: El tablero carga y se puede cambiar de entorno sin recrearlo. *Cubre el AC «El tablero permite distinguir desarrollo, staging y producción» de #214.*

---

## Phase 3: Alertas (P1) — US3, US4, FR-012–FR-017, FR-024

- [ ] T032 [P] Crear `monitoring/prometheus/rules/goblinhub.yml` con las alertas preventivas A-01 a A-08, cada una con `expr`, `for`, `labels.severity` y `annotations` con `summary` y `cause` (FR-012, FR-013, FR-015)
- [ ] T033 [P] Crear en el mismo fichero las alertas críticas A-09 a A-14 (FR-012, FR-013, FR-015)
- [ ] T034 Añadir la alerta A-14 de disco lleno, que vigila que el propio Prometheus siga escribiendo (FR-012, `plan.md` §4.2)
- [ ] T035 Crear `monitoring/alertmanager/alertmanager.yml.template` con `group_by: [alertname, deployment_environment]`, `group_wait: 30s`, `group_interval: 5m` y `repeat_interval: 4h` (FR-016)
- [ ] T036 [P] Añadir la regla de inhibición: una alerta `critical` inhibe a su `warning` equivalente por `alertname` y entorno (FR-016)
- [ ] T037 [P] Configurar los tres receptores con valores por variable de entorno: `email_configs`, `slack_configs` y `discord_configs` (FR-017)
- [ ] T038 Validar las reglas con `promtool check rules` y la configuración con `promtool check config` (FR-023)
- [ ] T039 [P] Crear `docs/RUNBOOK_MONITOREO.md` con una sección por familia de alerta: severidad, causa probable, pasos de respuesta y escalado dentro del equipo (Sadrach34, Alfion72, Ddarielz, AdrianS-127) (FR-015, FR-024)
- [ ] T040 Documentar en el runbook cómo configurar cada canal y qué hacer si ninguno está configurado (FR-017, `plan.md` §5)

**Checkpoint**: Las tres familias de alerta del AC de #214 están definidas, validadas y con respuesta documentada. *Cubre los AC «alertas accionables» y «severidad, causa probable y procedimiento de respuesta» de #214.*

---

## Phase 4: Verificación y evidencia (P1) — US5, US7, FR-021–FR-025

- [ ] T041 [P] Crear `.github/workflows/monitoring.yml` que ejecute `promtool check rules`, `promtool check config` y el generador de configuración, y falle ante un error (FR-023)
- [ ] T042 [P] Verificar con `git grep` que no hay secretos versionados y adjuntar el resultado al PR (FR-021)
- [ ] T043 Levantar el stack en local y provocar la condición de A-12 (respuestas 5xx sostenidas) para dispararla de verdad (FR-025)
- [ ] T044 [P] Capturar la evidencia de la alerta disparada: regla, severidad, causa probable y recepción en el canal configurado (FR-025, US7)
- [ ] T045 Levantar el stack y verificar que el tablero distingue los tres entornos (FR-010)
- [ ] T046 Verificar que `/healthz` y `/health/ready` cierran la inconsistencia de `infra/terraform/main.tf:44` y de `scripts/deploy/healthcheck.sh` (FR-007)
- [ ] T047 Ejecutar el gate completo `npm run api` y adjuntar el resultado al PR (Principios I y V)
- [ ] T048 Abrir el PR de #214 a `develop` con la plantilla, `Closes #214` y la evidencia adjunta (FR-025)

**Checkpoint**: Feature completa y con evidencia. *Cierra #214.*

---

## Phase 5: Extensiones (fuera de alcance de #214, documentadas como deuda)

- [ ] T049 [P] Migrar los logs a formato JSON estructurado con `nestjs-pino` y añadir datasource de Loki (punto 2 de `BACKEND_REVIEW.md` §7.8)
- [ ] T050 [P] Incorporar trazas distribuidas con OpenTelemetry para la API y Prisma (§7.4)
- [ ] T051 Migrar el almacenamiento a Mimir o Thanos para retención larga y alta disponibilidad
- [ ] T052 Añadir `postgres_exporter` y `redis_exporter` para métricas de las dependencias
- [ ] T053 Definir un calendario de tráfico por franja horaria y promover M-07 (throughput) de informativa a preventiva
- [ ] T054 Mover el cron de backup a un worker con lock distribuido, para cerrar la alerta A-05 (§7.1)
- [ ] T055 Escalar la alerta de caída (A-09) a preventable si algún día se migra Render a un plan que suspenda instancias

**Checkpoint**: Deuda registrada y ordenada por beneficio, sin comprometer el alcance de #214.

---

## Trazabilidad de tareas a requisitos

| Requisito | Tareas |
|---|---|
| FR-001, FR-004 | T008, T009, T010, T014, T016 |
| FR-002, FR-003 | T011, T012 |
| FR-005 | T013 |
| FR-006 | T015 |
| FR-007 | T014, T046 |
| FR-008 | T017, T020 |
| FR-009, FR-010 | T028, T029, T045 |
| FR-011 | T027 |
| FR-012, FR-013, FR-015 | T032, T033, T034, T039 |
| FR-014 | T009, T010 (catálogo de `plan.md` §2 y §3) |
| FR-016 | T035, T036 |
| FR-017 | T037, T040 |
| FR-018, FR-019 | T026, T030 |
| FR-020 | T021, T024, T025 |
| FR-021, FR-022 | T022, T023, T042 |
| FR-023 | T038, T041 |
| FR-024 | T039 |
| FR-025 | T043, T044 |
| Out of scope | T049–T055 |
