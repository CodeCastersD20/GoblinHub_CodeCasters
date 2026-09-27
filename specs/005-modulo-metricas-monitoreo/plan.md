# Implementation Plan: Módulo de métricas de monitoreo (Prometheus + Grafana + Alertmanager)

**Branch**: `docs/210-planeacion-sdd-metricas-monitoreo` (planeación) → `feat/214-tablero-y-alertas-de-metricas` (implementación) | **Date**: 2026-09-26 | **Spec**: `specs/005-modulo-metricas-monitoreo/spec.md`

**Input**: Feature specification from `/specs/005-modulo-metricas-monitoreo/spec.md`

**Decisión de stack**: Prometheus + Grafana + Alertmanager, seleccionada y
justificada en `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md`.

## Summary

Instrumentar el backend de GoblinHub para que exponga métricas técnicas en formato
estándar (`/metrics`), y añadir un stack de Docker Compose con Prometheus,
Grafana y Alertmanager que proporcione un tablero por entorno y alertas
accionables de caída, latencia y tasa de error. Las métricas de negocio se
obtienen de un datasource de solo lectura sobre la base de datos existente, sin
código nuevo en el backend. Toda la configuración vive en el repositorio; los
secretos, solo por variable de entorno.

Este documento es el entregable de **#210**. La implementación corresponde a
**#214**.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre NestJS 11 (API), Node 20 (script de configuración)

**Primary Dependencies**: `prom-client` (exposición de métricas), Prometheus 3.x, Grafana 11.x, Alertmanager 0.27.x

> Sin dependencias de health check en esta iteración: `/healthz` y
> `/health/ready` se resuelven en el controlador del módulo (ver *Complexity
> Tracking*). `@nestjs/terminus` queda reservado para una iteración con más
> comprobaciones.

**Storage**: volumen local de Prometheus (retención 30d); PostgreSQL/Supabase existente como datasource de negocio

**Testing**: Jest (unitarios del interceptor y del servicio de métricas), `promtool check rules` (validación de reglas), Supertest (`test/jest-e2e.json`) para `/metrics` y los health checks

**Target Platform**: Render (`plan = "starter"`, `infra/terraform/main.tf:36-53`) para la API; Docker Compose local para el stack de monitoreo

**Project Type**: módulo NestJS (nuevo) + stack de observabilidad

**Performance Goals**: el interceptor de métricas añade < 1 ms por petición; `prom-client` es un contador en memoria

**Constraints**: sin coste de licencia; sin agentes en el host de Render; sin secretos versionados (Principio II); los nuevos endpoints no pueden alterar el contrato de negocio

**Scale/Scope**: 1 API (3 entornos), ~12 métricas técnicas, ~8 de negocio, 8 reglas de alerta, 1 tablero

## Constitution Check

- **Principio I (Test-First)**: el interceptor de métricas, el servicio de backup y
  los health checks se prueban con Jest antes de declarar la tarea completada; las
  reglas se validan con `promtool check rules` en CI. **Cumple.**
- **Principio II (Security-First)**: `SECURITY_FIRST`. `/metrics` queda fuera del
  CORS de la API y no se expone al frontend; la configuración se genera desde
  variables de entorno y el `.env` real está ignorado por git. **Cumple.**
  *Revisión pendiente de la Implementación*: confirmar en el PR de #214 que
  `/metrics` no es alcanzable desde el navegador público sin autorización.
- **Principio III (Type-Safe)**: el catálogo de métricas se materializa como
  `Record<string, Gauge>` tipado en el servicio; sin `any`. **Cumple.**
- **Principio IV (Modular Single-Responsibility)**: módulo nuevo
  `modules/metrics/` con el interceptor, el servicio de registros y el
  controlador, siguiendo la estructura `application/domain/infrastructure/interfaces`
  ya usada en `modules/logs/` y `modules/reports/`. **Cumple.**
- **Principio V (E2E Integration Verification)**: se añaden casos Supertest para
  `/metrics`, `/healthz` y `/health/ready`, y la evidencia de una alerta disparada
  se adjunta al PR. **Cumple.**
- **Documentación** (`/docs`): este plan, el runbook y el catálogo son la
  documentación del contrato operativo. **Cumple.**

**Gate**: `npm run api` (lint + `tsc --noEmit` + build + `test:cov`) debe pasar, y
`promtool check rules` debe validar el fichero de reglas.

## 1. Arquitectura

```text
                    ┌──────────────────────┐
                    │  Render: goblinhub-  │
                    │  api  (plan starter) │
                    │  :3000               │
                    │                      │
   Prometheus ──────►  /metrics   (pull)  │
   (scrape 15s) ────►  /healthz           │
   (blackbox)  ────►  /health/ready       │
                    └──────────┬───────────┘
                               │ read-only
                               ▼
                    ┌──────────────────────┐
                    │ PostgreSQL Supabase  │  ← datasource de negocio (Grafana)
                    └──────────────────────┘

   Prometheus ──eval──► Alertmanager ──► correo / Slack / Discord
        │                                      (valores por variable de entorno)
        └── datasource + tablero provisionado en Grafana
```

**Decisión de diseño clave**: las **métricas técnicas** salen de `/metrics` con
`prom-client`; las **métricas de negocio** salen de consultas SQL sobre las
tablas que ya existen, ejecutadas por Grafana. Así se cumple el alcance de
"métricas técnicas y de negocio" de #210 sin añadir collectors de negocio al
backend (criterio de no escribir código nuevo), y sin duplicar en Prometheus lo
que la base de datos ya sabe.

## 2. Catálogo de métricas técnicas

Cada métrica declara **umbral, unidad, fuente y acción**, como exige el criterio de
aceptación de #210.

| # | Métrica | Tipo | Unidad | Umbral preventivo | Umbral crítico | Fuente | Acción |
|---|---|---|---|---|---|---|---|
| M-01 | Disponibilidad del servicio (`up`) | Gauge | 0/1 | — | `== 0` durante 2 min | `up` (scrape Prometheus) | **Crítica**: comprobar `render logs`; si es un despliegue, reverts; si es BD, restaurar conexión (§4.1) |
| M-02 | Disponibilidad mensual | Recording rule | % | < 99,5 % | < 99 % | `avg_over_time(up[30d])` | **Preventiva**: revisar incidentes del mes; **crítica**: postmortem y plan de mejora |
| M-03 | Latencia P50 | Histograma | s | — | — | `goblinhub_http_request_duration_seconds` | Referencia de línea base del tablero |
| M-04 | Latencia P95 | Histograma | s | > 1,0 s por 10 min | > 2,5 s por 5 min | M-03 | **Preventiva**: identificar la ruta más lenta; **crítica**: si es Prisma, revisar consultas (§4.2) |
| M-05 | Latencia P99 | Histograma | s | > 3,0 s por 10 min | > 5,0 s por 5 min | M-03 | Complementa P95 para detectar colas largas |
| M-06 | Tasa de error 5xx | Ratio derivado | ratio 0–1 | > 1 % por 10 min | > 5 % por 5 min; > 20 % por 1 min | `goblinhub_http_requests_total{status=~"5.."}` | **Preventiva**: filtrar por `route` en el tablero; **crítica**: si afecta a `/auth`, posible caída de Supabase (§4.3) |
| M-07 | Throughput | Counter derivado | req/s | < 0,1 req/s en 15 min *(informativa)* | — | `rate(goblinhub_http_requests_total[5m])` | Línea base de demanda; marcada informativa hasta tener calendario de tráfico por franja horaria |
| M-08 | Memoria residente | Gauge | bytes | > 419 430 400 (400 MiB) por 10 min | > 629 145 600 (600 MiB) por 5 min | `process_resident_memory_bytes` | **Preventiva**: buscar fuga; si es por `sharp` en uploads, limitar concurrencia (§4.4) |
| M-09 | CPU del proceso | Counter derivado | cores | > 0,85 por 15 min | > 1,5 por 5 min | `rate(process_cpu_seconds_total[5m])` | Revisar throttling o consultas N+1 |
| M-10 | Event loop lag P95 | Histograma | s | > 0,2 por 10 min | > 0,5 por 5 min | `nodejs_eventloop_lag_seconds` | Señaliza que el cron `@nestjs/schedule` compite con el tráfico (`BACKEND_REVIEW.md` §7.1) |
| M-11 | Pool de conexiones Prisma | Gauge | conexiones | > 80 % del máximo por 10 min | > 95 % por 5 min | `goblinhub_prisma_pool_connections_{in_use,max}` | Reducir `connection_limit` o activar PgBouncer en Supabase (§7.1) |
| M-12 | Antigüedad del último backup | Gauge | s (epoch) | > 90 000 s (25 h) | > 172 800 s (48 h) | `goblinhub_backup_last_success_timestamp_seconds` | Cierra el hallazgo "backups sin monitoreo" de `BACKEND_REVIEW.md` §7.4: ejecutar el backup manual y revisar `pg_dump` |
| M-13 | Salud de `/health/ready` | Gauge | 0/1 | — | `== 0` durante 2 min | `goblinhub_health_ready` | Proceso vivo pero sin BD: **no** reiniciar en cascada; diagnosticar conexión |
| M-14 | Estado de la config de Prometheus | Gauge | 0/1 | — | `== 0` | `prometheus_config_last_reload_successful` | El monitoreo se está auto-midiendo; evita alertas mudas |
| M-15 | Espacio en disco del host de métricas | Gauge | % | > 80 % | > 90 % | `node_filesystem_avail_bytes` | Poda la retención; sin espacio, Prometheus deja de escribir y **todas** las alertas se apagan |

> M-02, M-07, M-09, M-11 y M-15 se calculan con *recording rules* o métricas
> aportadas por `node_exporter`, no por el código de la aplicación.

## 3. Catálogo de métricas de negocio

Se consultan con el datasource PostgreSQL de solo lectura sobre las tablas
existentes (`usuarios`, `eventos`, `inscripciones`, `logs_actividad`,
`productos`, `canjes`). Cubre el alcance "métricas técnicas y de negocio" de #210.

| # | Métrica | Unidad | Consulta base | Umbral | Acción |
|---|---|---|---|---|---|
| N-01 | Registros por día | usuarios/día | `COUNT(*)` sobre `usuarios` agrupado por día sobre `created_at` | Caída > 50 % frente a la media de 7 días | **Informativa**: revisar si es un fin de semana, una campaña caída o un fallo de alta |
| N-02 | Eventos creados por mes | eventos/mes | `COUNT(*)` sobre `eventos` por `DATE_TRUNC('month', created_at)` | Sin eventos nuevos en 45 días | Revisar el calendario; el producto es de eventos, no tenerlos es una señal |
| N-03 | Inscripciones por mes | inscripciones/mes | `COUNT(*)` sobre `inscripciones` por mes, ignorando `deleted_at IS NOT NULL` | Caída > 60 % frente al mes anterior | Señal de problema en el embudo de inscripción |
| N-04 | Tasa de conversión inscripción → asistencia | % | `100 * COUNT(*) FILTER (WHERE asistio) / COUNT(*)` sobre `inscripciones` | < 40 % | Revisar la fricción del flujo de asistencia |
| N-05 | Ocupación de cupos | % | `100 * COUNT(inscripciones) / SUM(eventos.cupo_maximo)` por evento | > 90 % o < 10 % | Si se llena: abrir más eventos. Si está vacío: revisar difusión |
| N-06 | Inscripciones por evento (top) | inscripciones | `COUNT(*)` por `id_evento` sobre `inscripciones` | — | Detectar eventos con contraste anómalo |
| N-07 | Actividad registrada por día | eventos de log | `COUNT(*)` sobre `logs_actividad` por día sobre `fecha_hora` | Caída brusca | Si cae, puede ser que el interceptor de auditoría también esté fallando (§4.5) |
| N-08 | Canjes realizados | canjes | `COUNT(*)` sobre `canjes` por mes | — | Actividad del módulo de recompensas |

> Las consultas ignoran `deleted_at` porque el borrado lógico es la norma del
> proyecto (`.specify/memory/constitution.md`).

## 4. Reglas de alerta

### 4.1 Preventivas (`severity: warning`)

| ID | Alerta | Expresión PromQL (esquemática) | `for` | Causa probable | Respuesta |
|---|---|---|---|---|---|
| A-01 | Latencia P95 degradada | `histogram_quantile(0.95, sum by (le) (rate(goblinhub_http_request_duration_seconds_bucket[5m]))) > 1` | 10m | Consultas lentas a PostgreSQL, caché de dashboard ausente (§1.3 de `BACKEND_REVIEW.md`) | Localizar la `route` más lenta en el tablero; si es un agregado, aplicar caché Redis |
| A-02 | Tasa de error 5xx elevada | `sum(rate(...{status=~"5.."}[5m])) / sum(rate(...[5m])) > 0.01` | 10m | Error de negocio no controlado, caída de dependencia externa | Filtrar por `route`; reproducir; revisar logs del `requestId` |
| A-03 | Memoria residente alta | `process_resident_memory_bytes > 419430400` | 10m | Fuga lenta, o caché en memoria sin límite | Comparar con la tendencia; si crece monótonamente, es fuga |
| A-04 | CPU sostenida | `rate(process_cpu_seconds_total[5m]) > 0.85` | 15m | Consultas N+1, serialización costosa, `sharp` en uploads | Identificar la ruta con mayor latencia asociada |
| A-05 | Event loop bloqueado | `histogram_quantile(0.95, sum by (le) (rate(nodejs_eventloop_lag_seconds_bucket[5m]))) > 0.2` | 10m | El cron de backup/expiraciones compite con el tráfico (§7.1) | Mover el cron a un worker o acquires lock distribuido con Redis |
| A-06 | Pool de Prisma saturado | `goblinhub_prisma_pool_connections_in_use / goblinhub_prisma_pool_connections_max > 0.8` | 10m | Límite de conexiones de Supabase alcanzado | Ajustar `connection_limit` o activar PgBouncer |
| A-07 | Backup atrasado | `time() - goblinhub_backup_last_success_timestamp_seconds > 90000` | 1h | `pg_dump` ausente en la imagen, o el cron no se ejecutó | Ejecutar el backup manual; revisar `scripts/backup.sh` |
| A-08 | Registros por debajo de lo esperado | `deriv(N-01[7d]) < 0` | 1d | Problema en el alta de usuarios, o estacionalidad | **Informativa**: contrastar con la media de 7 días antes de escalar |

### 4.2 Críticas (`severity: critical`)

| ID | Alerta | Expresión PromQL (esquemática) | `for` | Causa probable | Respuesta |
|---|---|---|---|---|---|
| A-09 | Servicio caído | `up{job="goblinhub-api"} == 0` | 2m | Processo caído, despliegue fallido, o sin memoria para arrancar | `render logs -s goblinhub-api`; si es un despliegue, reverts al commit anterior; comprobar `/health/ready` (§4.3) |
| A-10 | Dependencia crítica caída | `goblinhub_health_ready == 0` | 2m | PostgreSQL inalcanzable (Supabase) | **No** reiniciar en cascada; verificar límites de conexión de Supabase |
| A-11 | Latencia P95 crítica | `histogram_quantile(0.95, ...) > 2.5` | 5m | Dependencia lenta o saturación de la BD | Revisar el panel de recursos en paralelo; si CPU y BD están bien, es una ruta concreta |
| A-12 | Tasa de error crítica | ratio `> 0.05` | 5m | Fallo generalised (no puntual) | Identificar la ruta con más 5xx; si es `/auth`, revisar Supabase Auth |
| A-13 | Error rate extremo | ratio `> 0.20` | 1m | Caída total del servicio | Tratar como A-09: hay que devolver el servicio |
| A-14 | Métricas sin escribir (disco lleno) | `predict_linear(node_filesystem_avail_bytes[6h], 4*24*3600) < 0` | 30m | Prometheus dejó de escribir; **todas** las alertas están mudas | Reducir retención o expandir volumen; verificar que las alertas se rearmaron |

> A-14 existe por un fallo silencioso clásico: si Prometheus deja de escribir, el
> Absent alert deja de evaluarse, no se dispara, y el equipo cree que todo está
> bien. Es la métrica que vigila al vigilante.

### 4.3 Inhibición y agrupamiento

- **Inhibición**: una alerta `critical` inhibe a su `warning` equivalente cuando
  coinciden en `alertname` y `deployment_environment`, para no enviar dos avisos
  del mismo problema.
- **Agrupación**: `group_by: [alertname, deployment_environment]`, con
  `group_wait: 30s`, `group_interval: 5m` y `repeat_interval: 4h`. Una ventana de
  `up == 0` con 50 rutas affected no debe generar 50 correos.
- **Silenciado**: durante despliegues se silencia `A-09` en el entorno afectado
  para no generar ruido por reinicios planificados.

## 5. Canales de notificación

Los tres canales que acepta el criterio de aceptación quedan **definidos y
documentados**; el receptor real es configuración pendiente del equipo, tal como
se acordó.

| Canal | Configuración | Variables | Estado |
|---|---|---|---|
| **Correo** | `email_configs` con SMTP | `ALERTMANAGER_SMTP_HOST`, `ALERTMANAGER_SMTP_PORT`, `ALERTMANAGER_SMTP_USERNAME`, `ALERTMANAGER_SMTP_PASSWORD`, `ALERTMANAGER_EMAIL_FROM` | Configurado en la plantilla, sin valor real |
| **Slack** | `slack_configs` con *incoming webhook* | `SLACK_WEBHOOK_URL` | Configurado en la plantilla, sin valor real |
| **Discord** | `discord_configs` con *webhook* | `DISCORD_WEBHOOK_URL` | Configurado en la plantilla, sin valor real |
| **UI de Alertmanager** | Siempre activa, no requiere credenciales | — | **Funciona desde el primer arranque**: es el canal de respaldo mientras el equipo configura los demás |

Si el equipo no configura ningún canal externo, las alertas siguen siendo
consultables en la UI de Alertmanager y visibles en el tablero, de modo que el
sistema nunca queda mudo por falta de credenciales.

**Riesgo asumido**: si `SLACK_WEBHOOK_URL` está vacío, Alertmanager registra un
error de carga de configuración. Se documenta que al menos un canal debe quedar
configurado, y se propone un job de verificación de arranque.

## 6. Separación de entornos

| Aspecto | Decisión |
|---|---|
| Etiqueta | `deployment_environment`, valor de la variable `DEPLOY_ENV` (`development` \| `staging` \| `production`) |
| Dónde se aplica | Como etiqueta constante en `prom-client`, de modo que **toda** métrica de la app la lleva |
| Targets | `prometheus.yml` define un *job* por entorno con su `metrics_path`; los endpoints vienen de variables de entorno |
| Tablero | Una variable `$env` (datasource Prometheus + consulta con `{deployment_environment="$env"}`) en lugar de tres datasources |
| Alertas | Etiqueta de entorno en cada alerta, para que el enrutado pueda dirigir a un canal distinto por entorno |
| Regla | Un dashboard con `$env` es preferible a tres dashboards: los paneles se mantienen en un solo fichero y los entornos no pueden divergir |

**Inconsistencia que este plan cierra**: `infra/terraform/main.tf:44` declara
`health_check_path = "/healthz"` y `goblinhub-api/scripts/deploy/healthcheck.sh`
consulta `$HEALTHCHECK_URL`, pero la API **no expone** ese endpoint
(`src/app.module.ts` declara `controllers: []`). `FR-007` lo implementa.

## 7. Generación de configuración y secretos

**Trampa a documentar**: Prometheus **no** interpola variables de entorno en
`prometheus.yml`. El patrón habitual con `envsubst` no es fiable en la imagen
oficial, así que el plan usa un generador propio en Node, sin dependencias nuevas
(coherente con el stack del proyecto y disponible en el devcontainer):

```text
monitoring/.env.example      →  todas las variables documentadas, sin valores
monitoring/scripts/generate-config.mjs  →  lee .env, escribe los .yml finales
monitoring/prometheus/prometheus.yml.template
monitoring/alertmanager/alertmanager.yml.template
monitoring/grafana/provisioning/{datasources,dashboards}/*.yml
monitoring/grafana/dashboards/*.json
```

- El `.env` real queda **ignorado por git** (mismo patrón que
  `sonarqube/.env`).
- `generate-config.mjs` falla con código distinto de cero si falta una variable
  obligatoria, para que CI detecte la configuración incompleta.
- Ningún secreto se escribe en los `.yml` generados que se versionan: los
  ficheros generados quedan también fuera de git cuando contienen credenciales.

## 8. Estructura de proyecto prevista

```text
# Documentación (este entregable)
docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md
docs/RUNBOOK_MONITOREO.md
specs/005-modulo-metricas-monitoreo/{spec,plan,tasks}.md

# Módulo de métricas (issue #214)
goblinhub-api/src/modules/metrics/
├── metrics.module.ts
├── application/
│   ├── use-case/get-metrics.use-case.ts
│   └── use-case/get-backup-freshness.use-case.ts
├── domain/
│   ├── constants/metric-registry.ts      # catálogo tipado
│   └── entities/metric-set.entity.ts
├── infrastructure/
│   ├── interceptors/metrics.interceptor.ts
│   └── services/metrics.service.ts
└── interfaces/controllers/metrics.controller.ts   # /metrics, /healthz, /health/ready

# Stack de monitoreo (issue #214)
monitoring/
├── README.md
├── .env.example
├── docker-compose.yml
├── scripts/generate-config.mjs
├── prometheus/prometheus.yml.template
├── prometheus/rules/goblinhub.yml
├── alertmanager/alertmanager.yml.template
└── grafana/
    ├── provisioning/datasources/datasources.yml
    ├── provisioning/dashboards/dashboards.yml
    └── dashboards/goblinhub-overview.json

# CI
.github/workflows/monitoring.yml            # promtool check rules + check config
```

**Decisión de estructura**: el módulo sigue la convención `application/domain/
infrastructure/interfaces` ya usada en `modules/logs/` y `modules/reports/`, y el
stack de monitoreo vive en `monitoring/`, en paralelo a `sonarqube/` y `infra/`.

## 9. Matriz de trazabilidad

Cubre los criterios de aceptación de #210 y de #214, para que no quede ninguno
sin implementar.

| Criterio de aceptación | Origen | Requisito | Sección | Tarea |
|---|---|---|---|---|
| Cada decisión de herramienta está justificada | #210 | — | `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md` §3, §4 | T001, T002 |
| Se especifican alertas preventivas, críticas y canales de notificación | #210 | FR-012, FR-013, FR-016, FR-017 | §4.1, §4.2, §4.3, §5 | T032–T037, T040 |
| Las métricas tienen umbral, unidad, fuente y acción | #210 | FR-014 | §2, §3 | T005, T009, T010 |
| Las tareas son implementables y trazables a la spec | #210 | — | `tasks.md` (cada tarea con su FR) | T006 |
| Se prepara el PR general de planeación SDD | #210 | — | — | T003 |
| Se instrumentan disponibilidad, latencia, tasa de errores y recursos | #214 | FR-001–FR-006 | §2 (M-01 a M-12) | T008–T020 |
| El tablero permite distinguir desarrollo, staging y producción | #214 | FR-009, FR-010 | §6 | T028, T029, T045 |
| Existen alertas accionables para caída, latencia y error rate | #214 | FR-012, FR-013 | §4.1, §4.2 | T032–T034 |
| Las alertas indican severidad, causa probable y procedimiento de respuesta | #214 | FR-015, FR-024 | §4.1, §4.2, `docs/RUNBOOK_MONITOREO.md` | T032, T033, T039, T040 |
| Se documentan variables, endpoints, credenciales/secretos y parámetros sin exponer secretos | #214 | FR-020–FR-023 | §5, §7 | T022, T023, T024, T031, T041, T042 |
| Se adjunta evidencia de una prueba de alerta y su PR | #214 | FR-025 | §4.1 | T043, T044, T048 |

## Complexity Tracking

| Complejidad | Justificación | Alternativa descartada |
|---|---|---|
| Generador de configuración en Node en vez de `envsubst` | Prometheus no interpola variables en su fichero de configuración | Usar `envsubst`, que no está garantizado en la imagen oficial |
| Métricas de negocio por datasource SQL en vez de collectors en el backend | Evita código nuevo, reutiliza el esquema y los agregados ya implementados en `modules/reports/` | Collector con `$queryRaw` en el servicio de métricas: más código, más superficie, mismo resultado |
| Exponer `/healthz` y `/health/ready` sin Terminus | Dos rutas triviales evitan una dependencia para lo que el plan necesita | `@nestjs/terminus` es la opción canónica; se reserva para una iteración con más comprobaciones |
| Un solo tablero con variable `$env` en vez de tres | Los paneles se mantienen en un solo fichero y los entornos no divergen | Un tablero por entorno: multiplica el mantenimiento |
| Sin alta disponibilidad ni retención larga | El proyecto despliega un único backend; no es un requisito esta iteración | Mimir/Thanos quedan como ruta documentada de evolución |
