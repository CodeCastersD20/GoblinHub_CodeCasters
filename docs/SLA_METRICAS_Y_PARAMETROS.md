# SLA, métricas y parámetros del caso de estudio — GoblinHub

> **Issue:** [#203](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/203)
> `[Docs]: Definir SLA, métricas y parámetros del caso de estudio`
> **Autor:** @Sadrach34 · **Alcance:** documento canónico de niveles de servicio
> **Estado:** vigente para el caso de estudio · **Revisión:** al cierre de cada
> entrega de la Actividad 1.1

Este documento es la **fuente canónica** de los niveles de servicio (SLA) del
caso de estudio. Define qué medimos, con qué umbral, quién responde y qué se
hace cuando se incumple. Todo lo que aquí se afirma como «medido» tiene una
evidencia enlazada en el repositorio; lo que no está medido aparece marcado
como **brecha** en la sección 11, nunca como objetivo cumplido.

---

## 1. Propósito y alcance

| Campo | Detalle |
|---|---|
| Qué define | Disponibilidad, latencia, tasa de errores, RTO, RPO y tiempos de respuesta por entorno |
| Qué no define | Métricas técnicas de la herramienta de monitoreo (eso vive en la [#210](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/210) / [PR #216](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/216) y su implementación en la #214) |
| Productos | API NestJS (`goblinhub-api`), web React (`goblinhub_web`), PostgreSQL en Supabase, caché de roles en Redis |
| Entornos | `dev` (local) · `develop` (integración) · `staging` (pre-producción) · `main` (producción) |
| Vigencia | Hasta que la #214 deje Prometheus + Grafana + Alertmanager desplegados; entonces este documento pasa a ser la capa de **objetivos** sobre las **métricas** del módulo de monitoreo |

### 1.1 Referencias del repositorio

| Documento / evidencia | Qué aporta |
|---|---|
| [`k6/PLAN_K6.md`](../k6/PLAN_K6.md) | Plan de pruebas de carga y convención de `K6_BASE_URL` / `K6_TOKEN` |
| [`k6/RESULTADOS_SADRACH.md`](../k6/RESULTADOS_SADRACH.md) | p95 = **109,52 ms** en `POST /api/auth/signin` (bad path) |
| [`k6/RESULTADOS_AESR.md`](../k6/RESULTADOS_AESR.md) | p95 = **51,59 ms** en `GET /productos` |
| [`k6/RESULTADOS_ADRIANA.md`](../k6/RESULTADOS_ADRIANA.md) | p95 = **3,08 ms** en `GET /` |
| [`k6/RESULTADOS_ERICK.md`](../k6/RESULTADOS_ERICK.md) | p95 = **2,07 ms** en `GET /api/eventos` |
| [`sonarqube/RESULTADOS_SADRACH.md`](../sonarqube/RESULTADOS_SADRACH.md) | Quality Gate `OK`, 0 bugs, 0 vulnerabilidades, cobertura **87,4 %** |
| `snyk/POLITICA.md` (rama `feat/213-modulo-au-snyk`, [PR #215](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/215)) | Política de severidades y ventanas de remediación que se reutiliza en el escalamiento |
| `infra/terraform/` | Topología declarada: Render (web + API), Supabase (PostgreSQL), S3 (respaldos) |
| `goblinhub-api/.env.example` | Inventario de variables de entorno, sin valores reales |

---

## 2. Contexto del caso de estudio y capacidad del equipo

Los objetivos de este documento **no** son valores de una empresa en
producción: son el compromiso que un equipo de cuatro personas y un calendario
académico puede sostener de verdad. Fijar objetivos de empresa (99,95 % de
disponibilidad con guardia 24/7) sin esa capacidad produce un documento que
nadie cumple y una métrica que se ignora.

| Dimensión | Realidad del caso de estudio | Consecuencia en los SLA |
|---|---|---|
| Equipo | 4 integrantes (@AdrianS-127, @Alfion72, @Ddarielz, @Sadrach34), sin guardia nocturna | La disponibilidad objetivo baja a **99,5 %** y los tiempos de respuesta se expresan en horario laboral |
| Hosting | Render plan `starter` (un solo servicio web activo) + Supabase + Redis | No hay staging desplegado hasta que se contrate un entorno adicional |
| Datos | PostgreSQL único, respaldos diarios a las 02:00 | **RPO 24 h**; no se puede prometer point-in-time recovery sin confirmar el plan de Supabase |
| Restauración | Procedimiento manual (`scripts/restore.sh` o endpoint admin) | **RTO 30 min** con rollback de despliegue; la restauración de datos es una operación distincta y más lenta |
| Observabilidad | Sin APM ni monitor externo hoy; logs JSON en el backend | El objetivo de disponibilidad se **mide** a partir de la #214; antes se acota por contrato |
| Gobierno | Spec Kit + constitución del proyecto | Cada desviación de un SLA se documenta como incidencia, no se "ajusta" el número en silencio |

---

## 3. Topología de entornos y flujo de promoción

```
   local (dev)  ──push──▶  develop  ──PR──▶  staging  ──PR──▶  main
   sin SLA                integración        pre-producción       producción
   (:5173 + :3000)        (gates CI)          (QA manual)          (Render + Supabase)
```

| Entorno | Rama | Cómo se llega | Qué corre | Datos | SLA que aplica |
|---|---|---|---|---|---|
| **dev** | local | `git switch -c` + `.env` local | Vite `:5173`, Nest `:3000`, Redis local opcional | Semilla de desarrollo | Ninguno (fuera del contrato) |
| **desarrollo integrado** | `develop` | PR aprobado a `develop` | Todo el pipeline: lint, `tsc --noEmit`, build, unitarias, Playwright, Snyk | Sin datos de producción | S9–S11 (calidad del pipeline) |
| **pre-producción** | `staging` | PR `develop → staging` | Hoy **ningún servicio**: es una rama de QA manual sobre datos sintéticos | Datos sintéticos o anonimizados | S2–S8 con valores **informativos** |
| **producción** | `main` | PR `staging → main` (o `develop → main` mientras no exista staging) | API y web en Render, PostgreSQL en Supabase, caché en Redis | Reales | S1–S12 completos |

**Decisiones de operación (acordadas con el equipo):**

1. `staging` es una **rama de pre-producción**, no un entornoRender. El plan
   `starter` de Render solo admite un servicio web activo, así que los
   objetivos de staging se declaran como **informativos** hasta que exista el
   servicio; el documento no los presenta como cumplidos.
2. Ningún workflow del pipeline se dispara en `staging`: los triggers de
   `api.yml`, `web.yml`, `playwright.yml` y `continuous-release.yml` son
   `main` y `develop`. Moverlos a `staging` es trabajo futuro de la #214.
3. Mientras no exista servicio de staging, el PR de promoción
   `develop → main` ([#176](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/176))
   debe pasar a ser `develop → staging` cuando el entorno se cree.
4. `develop` es integración, no un entorno desplegado: la rama
   `branch = "develop"` de `infra/terraform/main.tf` es una definición
   declarativa **no aplicada** (IaC sin credenciales en el equipo).

---

## 4. Catálogo de SLA

Todos los SLA son **medibles** (tienen fuente de datos), tienen **periodo de
evaluación** explícito y una **acción de remediación** asociada. Los nombres de
las columnas siguen el criterio de aceptación de la #203: fuente, umbral y
acción.

| ID | SLA | dev | staging | producción | Periodo de evaluación | Fuente | Umbral | Alerta | Responsable | Acción de remediación |
|---|---|---|---|---|---|---|---|---|---|---|
| **S1** | Disponibilidad mensual del servicio | — | 95 % *(informativo)* | **99,5 %** | mensual, calculado sobre el mes calendario | Sondas de disponibilidad de Prometheus (futuro) / historial del servicio Render | < 99,5 % | Notificación al canal del equipo | Persona de guardia del periodo (§10) | Rollback al despliegue anterior (§5) y postmortem en ≤ 48 h |
| **S2** | Latencia de lectura (p95) | sin SLA | < 1 s *(informativo)* | **< 500 ms** | semanal, con la corrida de K6 del módulo | `k6/scripts/*_prueba.js` → `http_req_duration` p(95) | p95 > 500 ms | Falla el `threshold` del script y queda el run en GitHub Actions | Autoría del script K6 del endpoint | Índice Prisma, caché de roles en Redis, eliminar N+1, revisar plan de consulta |
| **S3** | Latencia de escritura (p95) en autenticación | sin SLA | < 1,5 s *(informativo)* | **< 1 s** | semanal, con la corrida de K6 del módulo | `k6/scripts/as_prueba.js` (u otro de `POST /auth/signin`) | p95 > 1 s | Ídem | Ídem | Revisar throttling, coste de verificación JWT y de la consulta de rol |
| **S4** | Tasa de error del servicio (5xx) | sin SLA | < 1 % *(informativo)* | **< 0,5 %** | semanal en carga; continua tras la #214 | K6 `http_req_failed` + logs JSON del backend | > 0,5 % | Falla del `threshold`; log de error con `correlationId` | Persona de guardia del periodo | Aislar el endpoint afectado, rollback si el error es de despliegue |
| **S5** | **RTO** — tiempo para restaurar el servicio | — | 4 h *(informativo)* | **30 min** (15 min si el healthcheck falla de forma automática) | por incidente | Runbook: `scripts/release/build.sh` → `scripts/deploy/trigger_render.sh` → `scripts/deploy/healthcheck.sh` | Se supera el objetivo | Aviso manual en el canal del equipo | Quien detecta el incidente | Re-despliegue del último commit estable en `main`; si no procede, promotions de imagen previa en Render |
| **S6** | **RPO** — pérdida máxima de datos tolerable | — | 24 h *(informativo)* | **24 h** | por incidente, contrastado con el último respaldo | Respaldo automático diario 02:00 (`BackupScheduler`) + `scripts/backup.sh` | Se pierden más de 24 h de escrituras | Log de error del `BackupScheduler` | Persona de guardia del periodo | Restaurar el último `backups/backup_<timestamp>.sql` validando su `manifest.json` (§9) |
| **S7** | Healthcheck posterior al despliegue | — | 200 en < 60 s *(informativo)* | **200 en < 30 s** | por despliegue | `GET /healthz` (liveness) | Código ≠ 200 o tiempo > objetivo | Sondeo de Render + script de healthcheck | Quien promotiona a `main` | Rollback inmediato; revisar el arranque de migraciones Prisma |
| **S8** | Readiness (dependencias) | — | 200 *(informativo)* | **200** en todo momento | por despliegue y bajo demanda | `GET /health` (PostgreSQL + Redis) | Respuesta 503 | Sonda externa (futuro) | Persona de guardia del periodo | Revisar la dependencia que reporta `down` en el cuerpo de la respuesta |
| **S9** | Pipeline verde en `develop` | 100 % | 100 % | 100 % | por pull request | `api.yml`, `web.yml`, `playwright.yml` y `snyk.yml` (PR #215) | Un solo job en rojo | Notificaciones de GitHub Actions | Autoría del PR | Corregir y re-ejecutar. **No hay bypass:** un PR rojo no se mergea |
| **S10** | Cobertura de código | ≥ 80 % | ≥ 80 % | ≥ 80 % | por pull request | SonarQube Quality Gate (`coverage`) | < 80 % | SonarQube | Autoría del PR | Añadir pruebas; hoy la línea base está en **87,4 %** |
| **S11** | Vulnerabilidades de dependencias y SAST | — | — | **0 `critical`** | por PR y barrido semanal | Snyk (`snyk.yml`, [PR #215](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/215)) | ≥ 1 `critical` | Reporte de Snyk en el *job summary* | Autoría del PR | Corregir dependencia; si no es viable, excepción en `.snyk` con vencimiento ≤ 30 días |
| **S12** | Tiempo de despliegue a producción | — | < 10 min *(informativo)* | **< 10 min** | por liberación | `continuous-release.yml` (push a `main`) | > 10 min | GitHub Actions | Quien mergea a `main` | Re-ejecutar el despliegue o hacer rollback |

### 4.1 Justificación de los valores de latencia

Los objetivos de S2 y S3 **no** son inventados: se fijan por encima de lo
medido, con margen suficiente para absorber la variabilidad normal de la
plataforma gestionada (Supabase, Render) sin convertir cada pico en un incidente.

| Endpoint | p95 medido | Evidencia | Objetivo de producción | Margen |
|---|---|---|---|---|
| `GET /` | 3,08 ms | [`RESULTADOS_ADRIANA.md`](../k6/RESULTADOS_ADRIANA.md) | 500 ms | ≈ 160× |
| `GET /api/eventos` | 2,07 ms | [`RESULTADOS_ERICK.md`](../k6/RESULTADOS_ERICK.md) | 500 ms | ≈ 240× |
| `GET /productos` | 51,59 ms | [`RESULTADOS_AESR.md`](../k6/RESULTADOS_AESR.md) | 500 ms | ≈ 9,7× |
| `POST /api/auth/signin` (bad path) | 109,52 ms | [`RESULTADOS_SADRACH.md`](../k6/RESULTADOS_SADRACH.md) | 1 000 ms | ≈ 9,1× |

**El `threshold` de K6 sigue siendo `p(95) < 5000` ms** en los siete scripts de
`k6/scripts/`. No hay contradicción: ese valor es una **red de seguridad técnica**
que evita que una ejecución con un tiempo patológico se lea como un resultado
válido, mientras que el SLA de S2 (500 ms) es el objetivo de servicio que se
reporta al usuario. Con el margen medido (9–240×), el SLA se cumplirá de forma
sostenida y solo se activa ante una regresión real (índice faltante, N+1, caché
de Redis caída).

**Por qué 99,5 % y no 99,9 %:** 99,9 % permite 43 minutos de caída al mes; con
cuatro personas y sin guardia nocturna, ese compromiso es incumplible por
definición y erosiona la credibilidad de todo el catálogo. 99,5 % equivale a
≈ 3,6 h/mes, una ventana en la que una incidencia real (una caída de Supabase,
un despliegue roto) cabe en un horario laboral con margen.

---

## 5. RTO y RPO: mecanismo real

### 5.1 RTO — 30 minutos

| Paso | responsible | Tiempo | Comprobación |
|---|---|---|---|
| 1. Detección | Sonda externa o primer usuario | — | `GET /health` devuelve 503 o el healthcheck de Render falla |
| 2. Diagnóstico | Persona de guardia | 5 min | `GET /health` indica qué dependencia está `down`; logs JSON del backend |
| 3. Rollback | Persona de guardia | 10 min | Redeploy del último commit estable de `main` en Render |
| 4. Verificación | Persona de guardia | 5 min | `scripts/deploy/healthcheck.sh` (15 intentos × 10 s) contra `/healthz` |
| 5. Confirmación | Persona de guardia | 5 min | `GET /health` = 200 y el flujo de login responde |
| 6. Cierre | Todo el equipo | ≤ 48 h | Postmortem: causa, detección, respuesta y acción preventiva |

> **Nota de coherencia:** el script de healthcheck admite **150 s** de espera
> (15 × 10 s), mientras que el objetivo S7 es 30 s. La diferencia es
> intencionada: el objetivo mide el tiempo hasta *servicio sano* y el script es
> la red que evita declare fallido un despliegue que aún está arrancando. Se
> registra como brecha B3 (§11) para acortar el script cuando exista el servicio
> de staging.

### 5.2 RPO — 24 horas

| Mecanismo | Detalle | Cobertura |
|---|---|---|
| Respaldo automático | `BackupScheduler` con cron `0 2 * * *` (02:00 diario) | Todo el esquema `public` |
| Comando | `pg_dump --format=plain --no-owner --no-acl --schema=public` | Respecto de Object Ownership, sin ACL: portable entre entornos |
| Evidencia de integridad | `manifest.json` con tamaño y checksum generado por `pg-secure-helper.cjs` | Detecta corrupción antes de restaurar |
| Aislamiento de credenciales | `BACKUP_DATABASE_URL` con `goblinhub_backup_user`; restauración con `goblinhub_restore_user` | Un respaldo no puede alterar datos ni escal privileges |
| Restauración | `scripts/restore.sh` o `POST /backup` con rol `admin` | Procedimiento manual, con registro en el runbook |
| Fuera del respaldo automático | Archivos subidos por usuarios en Supabase Storage | **Brecha B4** (§11): no cubiertos por `pg_dump` |

El tiempo entre el último respaldo correcto y un fallo de producción es, por
construcción, de hasta 24 horas: ese es el RPO que el caso de estudio puede
sostener. Un RPO de minutos exigiría point-in-time recovery, que depende del
plan de Supabase contratado y **no está confirmado** (brecha B5).

---

## 6. Parámetros de CI/CD

### 6.1 Workflows del repositorio

| Workflow | Se dispara en | Puerta que impone | Tiempo máximo | Artefactos / retención |
|---|---|---|---|---|
| `api.yml` | PR y push a `main`, `develop` | `npm run lint` · `npx tsc --noEmit` · `npm run build` · `npm run test:cov` | — | `coverage-report` (**7 días**) |
| `web.yml` | PR y push a `main`, `develop` | Lint, type check, build y pruebas del front | — | 2 artefactos (**7 días**) |
| `playwright.yml` | PR y push con cambios en `goblinhub_web/**` | Suite E2E completa | **60 min** | Reporte de Playwright (**30 días**) |
| `k6.yml` | Manual (`workflow_dispatch`) con entradas `K6_BASE_URL` y `K6_TOKEN` | `threshold` `p(95) < 5000` por script | — | Reporte de K6 |
| `snyk.yml` *(rama `feat/213-modulo-au-snyk`, [PR #215](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/215))* | PR, push a `main`/`develop`, semanal y manual | Gate de severidad (**`critical`** bloquea) | — | Reportes JSON (**30 días**) |
| `continuous-release.yml` | Push a `main` | Build, pruebas y despliegue a Render | — | — |

Parámetros comunes a todos: `concurrency` con `cancel-in-progress: true` para no
gastar minutos de runner con commitssupersedidos, `actions/checkout@v4`,
`actions/setup-node@v4` con **Node 20** y `npm ci` (instalación reproducible
desde el lockfile).

### 6.2 Scripts de liberación y despliegue

| Script | Parámetro requerido | Comportamiento | Verificación |
|---|---|---|---|
| `scripts/release/build.sh` | — | `npm ci` + `npm run build` | Falla ante cualquier error (`set -e`) |
| `scripts/test/run_tests.sh` | — | `npm run test` | Detiene la liberación si falla una prueba |
| `scripts/deploy/trigger_render.sh` | `RENDER_DEPLOY_HOOK_URL` *(secreto)* | `POST` al deploy hook de Render | Sale con error si el secreto no está definido |
| `scripts/deploy/healthcheck.sh` | `HEALTHCHECK_URL` *(secreto)* | Sondea hasta 15 veces cada 10 s; sale con 1 si nunca da 200 | Debe apuntar a `GET /healthz` |

---

## 7. Parámetros de entorno (sin secretos)

> **Regla de este documento:** se listan **nombres**, propósito y valores por
> defecto de ejemplo. Ningún valor real de `DATABASE_URL`, claves de Supabase,
> tokens de Snyk o URLs de deploy hook aparece aquí; viven en GitHub Secrets y
> en el `.env` local (ignorado por git). Plantilla de referencia:
> [`goblinhub-api/.env.example`](../goblinhub-api/.env.example).

### 7.1 API (`goblinhub-api/.env.example`)

| Variable | Propósito | Default | Sensible |
|---|---|---|---|
| `NODE_ENV` | Modo de ejecución | `development` | No |
| `PORT` | Puerto del proceso NestJS | `3000` | No |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma | `http://localhost:5173,http://localhost:3000` | No |
| `DATABASE_URL` | Conexión PostgreSQL (Supabase, modo sesión) | — (requerida) | **Sí** |
| `BACKUP_DATABASE_URL` | Conexión con `goblinhub_backup_user` para `pg_dump` | — (requerida) | **Sí** |
| `RESTORE_DATABASE_URL` | Conexión con `goblinhub_restore_user` para restaurar | — (requerida) | **Sí** |
| `SUPABASE_URL` | Proyecto de Supabase | — (requerida) | No |
| `SUPABASE_ANON_KEY` | Clave anónima para el cliente web | — (requerida) | **Sí** |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio para operaciones administrativas | — (requerida) | **Sí** |
| `SUPABASE_RESET_PASSWORD_URL` | Destino del enlace de recuperación de contraseña | `http://localhost:5173/reset-password` | No |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Ventana y límite global de peticiones por IP | `60000` ms / `10` req | No |
| `AUTH_SIGNIN_THROTTLE_TTL` / `AUTH_SIGNIN_THROTTLE_LIMIT` | Ventana y límite de `POST /auth/signin` | `90000` ms / `5` req | No |
| `REDIS_URL` | Caché de roles y perfil | `redis://localhost:6379` | **Sí** |

`/healthz` y `/health` están exentos del throttling global
(`@SkipThrottle()`): una sonda externa no debe recibir un 429 confundido con
una caída.

### 7.2 Infraestructura (`infra/terraform/variables.tf`)

| Variable | Propósito | Default | Sensible |
|---|---|---|---|
| `project_slug` | Sufijo de nombres de recursos | `goblinhub` | No |
| `render_api_key` | Credencial del proveedor Render | — (requerida) | **Sí** |
| `supabase_access_token` | Credencial del proyecto Supabase | — (requerida) | **Sí** |
| `supabase_org_id` | Organización de Supabase | — (requerida) | No |
| `supabase_database_password` | Contraseña de la base de datos administrada | — (requerida) | **Sí** |
| `database_url` | Conexión principal PostgreSQL | — (requerida) | **Sí** |
| `redis_url` | Conexión a Redis | — (requerida) | **Sí** |
| `aws_region` | Región del bucket de respaldos | `us-east-1` | No |

Topología declarada: servicio web en Render (región `oregon`, plan `starter`,
`health_check_path = "/healthz"`), proyecto Supabase en `us-east-1` y bucket S3
para respaldos. Los tres proveedores aparecen en `required_providers` con
versiones fijadas, de modo que `terraform validate` no necesita credenciales.

---

## 8. Observabilidad

| Fuente | Qué aporta hoy | Cobertura |
|---|---|---|
| Logs JSON del backend + `ActivityLogInterceptor` | Traza de actividad por petición con `correlationId` | Registros, sin agregación |
| `GET /health` (nuevo) | Estado de PostgreSQL y Redis con latencia y detalle del error | Continua a partir de este PR |
| K6 (`k6/scripts/*.js`) | Latencia p95, tasa de fallo y throughput bajo carga | Semanal, manual |
| SonarQube (`sonarqube/docker-compose.yml`) | Bugs, vulnerabilidades, code smells, cobertura, duplicación | Por PR |
| GitHub Actions | Estado de cada puerta del pipeline y artefactos | Por PR y por push |
| Snyk (`snyk.yml`, PR #215) | Dependencias, SAST e IaC con severidad y reporte | Por PR, semanal |
| Prometheus + Grafana + Alertmanager | **No existe todavía** | Llega con la #214 ([#210](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/210) ya fijó la herramienta) |

**Consecuencia honesta:** hasta que la #214 esté desplegada, S1 (disponibilidad)
**no tiene fuente de datos continua**. Se mide de forma puntual con K6 y con el
healthcheck, y se reporta como tal. El documento no declara un 99,5 % "cumplido"
mientras no exista la sonda.

---

## 9. Retención

| Dato | Retención | Mecanismo | Verificación |
|---|---|---|---|
| Artefactos de CI (`api.yml`, `web.yml`) | 7 días | `retention-days: 7` | Visor de artefactos del run |
| Reporte de Playwright | 30 días | `retention-days: 30` | Artefacto del run |
| Reportes de Snyk (JSON) | 30 días | `retention-days: 30` + tabla en el *job summary* | Artefacto y resumen del run |
| Respaldo de base de datos | **Sin poda automatizada** | `BackupScheduler` escribe un `.sql` diario en `backups/` | `backup.scheduler.ts` no borra nada (**brecha B4**) |
| Bucket S3 de respaldos | Sin definir | Declarado en Terraform, sin ciclo de vida definido (**brecha B6**) | `infra/terraform/main.tf` |
| Logs del backend | Retención del proveedor | Logs JSON en la salida del servicio | Sin configurar (depende de Render) |

La falta de poda es intencional mientras el volumen sea bajo y el disco
permita, pero es un riesgo conocido: el día que el volumen de respaldos supere
el espacio disponible, **todos** los respaldos dejarán de escribirse. Está
registrado como B4 con acción y responsable.

---

## 10. Escalamiento y responsables

### 10.1 Respuesta a incidentes

| Severidad | Ejemplo | Aviso | Objetivo de mitigación | Responsable |
|---|---|---|---|---|
| **P1 — Caída de servicio** | `GET /health` = 503 en producción, o el login falla para todo el mundo | 15 min | 30 min (S5) | Persona de guardia del periodo |
| **P2 — Degradación** | p95 por encima de S2, tasa de error > 0,5 % (S4) | 2 h | 1 jornada | Persona de guardia + autoría del módulo afectado |
| **P3 — Regresión sin impacto** | Un SLA de calidad (S10, S11) falla en el pipeline | En el PR | Antes del merge | Autoría del PR |
| **P4 — Mantenimiento** | Actualización de dependencia sin vulnerabilidad | En el PR | Sin plazo fijo | Autoría del PR |

Las ventanas de remediación por severidad de seguridad (`critical` 24 h,
`high` 7 días, `medium` 30 días, `low` 90 días) son las de
`snyk/POLITICA.md` y se aplican igual en este documento: un hallazgo `critical`
es un P1 aunque no haya caída visible.

### 10.2 Rotación propuesta

Se propone una **rotación semanal** entre las cuatro personas del equipo, en el
orden @AdrianS-127 → @Alfion72 → @Ddarielz → @Sadrach34. Reglas:

1. Quien rota es la responsable primaria de S1, S4, S5, S6 y S8 durante su semana.
2. La rotación empieza el lunes; la entrega de guardia se anuncia en el canal del
   equipo.
3. Fuera de horario laboral, la guardia responde desde las 08:00 del día siguiente
   hábil: el SLA de 99,5 % no exige presencia nocturna, sí exige que nadie diga
   que no vio la alerta.
4. Cualquier integrante puede actuar sobre un P1 sin esperar a su turno; la
   rotación define la respuesta primaria, no la única.

> **Pendiente de aprobación:** este es el orden propuesto en la revisión de la
> issue. El equipo debe confirmarlo (o proponer otro) en la entrega de la
> Actividad 1.1; hasta entonces se aplica por acuerdo informal.

### 10.3 Responsables por entregable

| Persona | Ámbito principal | SLA que responde |
|---|---|---|
| @AdrianS-127 | Módulo de métricas y monitoreo (#210/#214), pipeline | S1, S8 (tras la #214) |
| @Alfion72 | Frontend, release web | S12, S2 de lectura desde la UI |
| @Ddarielz | Frontend, autenticación y UX | S3, S4 de autenticación |
| @Sadrach34 | Infraestructura de pruebas, RBAC, CI/CD y documentación SDD | S5, S6, S7, S9 |

---

## 11. Brechas conocidas y decisiones pendientes

Estas brechas son la razón por la que varios SLA se marcan como *informativos*.
Cada una tiene dueño y criterio de cierre.

| ID | Brecha | Impacto | Acción propuesta | Responsable |
|---|---|---|---|---|
| **B1** | `goblinhub-api/Dockerfile` **no existe** en ninguna rama, pero Terraform despliega la API con `runtime = "docker"` y `docker_context = "goblinhub-api"` | El despliegue declarado en IaC no es ejecutable | Agregar el Dockerfile multi-stage de la API (trabajo aparte, fuera de la #203) | @Sadrach34 |
| **B2** | La API no tenía endpoint de salud | S7 y S8 no eran verificables | **Resuelto en este PR:** `GET /healthz` y `GET /health` | @Sadrach34 |
| **B3** | `healthcheck.sh` admite 150 s frente al objetivo de 30 s | Un arranque lento puede consumirse como incidente | Acortar a 6 intentos × 5 s cuando exista el servicio de staging | Quien promotea a `main` |
| **B4** | Sin poda de respaldos: `BackupScheduler` escribe un `.sql` diario sin borrar | Riesgo de disco lleno → pérdida de todos los respaldos | Poda por antigüedad (p. ej. 7 diarios + 4 semanales) y ciclo de vida en el bucket S3 | @Sadrach34 |
| **B5** | El PITR de Supabase no está confirmado según el plan contratado | No se puede ofrecer RPO por debajo de 24 h | Verificar el plan y documentar la ventana real de recuperación | Todo el equipo |
| **B6** | El bucket S3 de respaldos no define ciclo de vida | Costo y datos obsoletos retenidos | `aws_s3_bucket_lifecycle_configuration` en Terraform | @Sadrach34 |
| **B7** | `terraform` declara `branch = "develop"` con `auto_deploy = true` mientras el CD real dispara desde `main` | La IaC y la operación real no coinciden | Decidir una sola fuente de verdad de despliegue | @Sadrach34 |
| **B8** | Archivos de usuario en Supabase Storage fuera del alcance de `pg_dump` | RPO no cubre las imágenes de perfil | Extender el respaldo al bucket de Storage | @Ddarielz |
| **B9** | No existe monitor externo de disponibilidad | S1 se mide de forma puntual | Es parte de la #214 (Prometheus + Grafana + Alertmanager) | @AdrianS-127 |
| **B10** | No existe `terraform.tfvars.example` | La IaC obliga a escribir las variables a mano | Plantilla con los nombres de §7.2 y valores de ejemplo | @Sadrach34 |

---

## 12. Checklist de integración al Google Docs

La integración en el [Google Docs del caso de estudio](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/209)
la realiza el equipo completo; este documento es el contenido que se pega.

- [ ] Copiar §1–§2 en la sección de **justificación y alcance**.
- [ ] Copiar la tabla de §3 (entornos) junto al diagrama de flujo de promoción.
- [ ] Pegar la tabla de §4 **sin partirla**: es el criterio de aceptación central.
- [ ] Pegar §4.1 (justificación de latencia) para que los números no se
      pregunte de dónde salen.
- [ ] Copiar §5, §7 y §8 en los apartados de recuperación, configuración y
      observabilidad.
- [ ] Revisar que ninguna tabla de §7 haya quedado con valores de secreto.
- [ ] Enlazar este archivo desde el índice del documento para que la revisión
      pueda saltar al original del repositorio.
- [ ] Registrar la fecha de la última revisión y quién la aprobó.

---

## 13. Mantenimiento de este documento

| Situación | Acción |
|---|---|
| Se cumple un SLA por primera vez | Anotar la medición en la evidencia del módulo correspondiente, no aquí |
| Se incumple un SLA | Registrar incidencia con fecha, impacto, causa y acción (§10.1); el número **no** se ajusta |
| Cambia la topología (nuevo entorno, nuevo proveedor) | Actualizar §3, §7 y §8 en el mismo PR del cambio |
| Llega la #214 (monitoreo) | Añadir el enlace a la fuente real de S1, S4 y S8 y promover los SLA de *informativos* a *verificados* |
| Se añade un parámetro | Documentarlo en §6 o §7 el mismo día; una variable sin documentar es una configuración no auditada |
