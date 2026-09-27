# Runbook de Monitoreo — GoblinHub

**Proyecto:** GoblinHub  
**Documento de referencia:** `specs/005-modulo-metricas-monitoreo/`  
**Principio rector:** `.specify/memory/constitution.md` (Documentar decisiones técnicas siempre)

## 1. Propósito y alcance

Este runbook describe la respuesta operativa a las alertas A-01–A-14 definidas
en `monitoring/prometheus/rules/goblinhub.yml`. Su objetivo es que una persona
pueda ejecutar la mitigación correcta **sin adivinar** y sin abrir veinte
ventanas a la vez.

- **Producción**: alertas reales con `severity: warning|critical`.  
- **Staging**: alertas `severity: info` (informativas) y no notifican, porque
  el entorno no existe desplegado todavía (ver
  `docs/SLA_METRICAS_Y_PARAMETROS.md`, §2).  
- **development**: sin alertas (ruido local).

## 2. Arquitectura del stack de monitoreo

| Servicio | Puerto | Propósito |
|---|---|---|
| Prometheus | `9090` | Scrape de `/metrics`, `/healthz`, `/health/ready` y TSDB |
| Alertmanager | `9093` | Agrupado, inhibición (crítica silencia preventiva) y enrutado |
| Grafana | `3000` | Tablero `GoblinHub — Métricas y Monitoreo` |
| node_exporter | — | Métricas del host (solo usado por A-14) |

La configuración se genera desde `.env` con
`node monitoring/scripts/generate-config.mjs`. Nunca editar los ficheros
generados (`*.yml` fuera de `*.template`).

## 3. Cómo levantar el stack localmente

```bash
cd monitoring
cp .env.example .env
# Rellenar: DEPLOY_ENV=development, API_TARGET=localhost:3010 (o host.docker.internal:3010),
# GRAFANA_ADMIN_PASSWORD, y opcionalmente canales de notificación.
node scripts/generate-config.mjs
make up
```

Para adjuntar evidencia de una alerta (T043/T044):

```bash
make up-evidencia  # levanta mock-webhook en 9095
# El receptor `evidencia-prueba` solo existe si ALERTMANAGER_MOCK_WEBHOOK_URL tiene valor
```

Verificación rápida:

```bash
curl -s http://localhost:3010/metrics | head -5  # API local
curl -s http://localhost:9090/targets           # Prometheus
curl -s http://localhost:9093/api/v2/status     # Alertmanager
```

## 4. Campos obligatorios en alertas

Toda alerta que llega a un canal humano debe tener **tres** anotaciones
obligatorias (lo exige la plantilla de Alertmanager):

| Campo | Uso |
|---|---|
| `summary` | Qué está ocurriendo (con valor numérico formateado). |
| `cause` | Causa probable más directa, con pista para localizarla. |
| `runbook` | Ancla a este documento: `a01-latencia-p95`, etc. |

## 5. Alerta A-01 — Latencia P95 degradada (`warning`, 10m)

- **ID:** `A-01` (`alerta_id`)
- **Expresión (recording):** `goblinhub:http_p95_seconds{deployment_environment="production"} > 1`
- **`for`:** 10m
- **Resumen:** La latencia P95 supera 1 s de forma sostenida.

### Causa probable

Consultas lentas a PostgreSQL, falta de caché Redis para agregados del
dashboard o ruta con muchas dependencias externas.

### Diagnóstico

1. Abrir Grafana → `GoblinHub — Métricas y Monitoreo` → panel
   **Latencia por ruta (P95)**. Filtrar por `route` con mayor valor.
2. Comprobar panel **Pool Prisma** (A-06) y **CPU/Memoria** (A-04/A-03).
3. En `/metrics`, buscar las series con mayor `goblinhub_http_request_duration_seconds_bucket` para esa `route`.
4. Revisar logs de la API filtrando por `requestId` (el interceptor lo
   propaga al response header).

### Mitigación

- Si es un agregado de dashboard: añadir caché en Redis (TTL corto).
- Si es una consulta a PostgreSQL: revisar índice faltante, `EXPLAIN ANALYZE`
  sobre la query implicada.
- Si es dependencia externa: degradar la llamada (timeout + fallback).

### Escalada

Si tras 30 min no baja la latencia y afecta al checkout o a las inscripciones:
abrir incidente con `severity: critical` (puede evolucionar a A-11).

## 6. A-02 — Tasa de error 5xx elevada (`warning`, 10m)

- **Umbral:** > 1 % de peticiones en 5m.
- **Expresión:** `goblinhub:http_error_ratio_5m{deployment_environment="production"} > 0.01`

### Causa probable

Error de negocio no controlado o caída de una dependencia externa.

### Diagnóstico

1. Grafana → **Tasa de errores 5xx** + **Top rutas con 5xx**.
2. Filtrar por `route` y buscar `requestId` en logs.
3. Comprobar `/health/ready` (A-10): si está `0`, el origen es la
   indisponibilidad de dependencias, no un handler específico.

### Mitigación

- Corregir handler que lanza excepción no capturada.
- Si depende de Supabase Auth: verificar estado de Supabase y retries con backoff.
- Hacer rollback si el error apareció justo después de un despliegue.

## 7. A-03 — Memoria residente alta (`warning`, 10m)

- **Umbral:** > 400 MiB (`419430400 B`)
- **Expresión:** `process_resident_memory_bytes{deployment_environment="production"} > 419430400`

### Causa probable

Fuga lenta, caché en memoria sin límite o proceso que retiene buffers.

### Diagnóstico

1. Grafana → **Memoria y CPU**: observar tendencia (no solo el valor puntual).
   Si crece **monótonamente** entre despliegues, es fuga.
2. Comparar con el despliegue anterior (cambio de código que introduzca caché).
3. Revisar heap snapshots o métricas de GC si es necesario.

### Mitigación

- Reiniciar el servicio **solo** si la tendencia no se aplana y hay riesgo de
  OOM killer. Idealmente, identificar y corregir la fuga.
- Limitar caché en memoria (tamaño máximo + LRU).
- Verificar que buffers se liberan tras operaciones pesadas (uploads con
  `sharp`, exportaciones).

## 8. A-04 — CPU sostenida (`warning`, 15m)

- **Umbral:** > 85 % de una CPU (`rate(process_cpu_seconds_total[5m]) > 0.85`)
- **`for`:** 15m

### Causa probable

Consultas N+1, serialización costosa, procesamiento de imágenes (`sharp`) en
hilo principal o bucles sin pausa.

### Diagnóstico

1. Grafana → **Memoria y CPU** y **Latencia por ruta**: correlacionar con la
   ruta más lenta (A-01).
2. Buscar picos coincidentes con uploads o exports.
3. Revisar perfiles si el pico es recurrente.

### Mitigación

- Mover trabajo pesado a colas (BullMQ/Redis) en lugar de síncrono.
- Optimizar consultas (eager loading correcto, índices).
- Limitar tamaño de archivos subidos.

## 9. A-05 — Event loop bloqueado (`warning`, 10m)

- **Umbral:** P95 de `nodejs_eventloop_lag_seconds > 0.2` (200 ms)
- **Expresión:** `histogram_quantile(0.95, rate(nodejs_eventloop_lag_seconds_bucket[5m])) > 0.2`

### Causa probable

Cron de backup o de expiraciones compite con el tráfico. Operación síncrona
larga que bloquea el event loop (CPU-bound).

### Diagnóstico

1. Grafana → **Event loop lag (P95)**.
2. Correlacionar con horario del cron (`BackupService` ejecuta a las 03:00
   según el código; verificar en logs).
3. Comprobar si el pico coincide con despliegues o tareas masivas.

### Mitigación

- Mover cron a un worker separado (otro proceso) o usar `setImmediate` y
  dividir lotes.
- Evitar `fs.readFileSync`/loops síncronos grandes en petición HTTP.
- Usar lock distribuido con Redis si varias réplicas compiten (Render puede
  escalar réplicas en el futuro).

## 10. A-06 — Pool de Prisma saturado (`warning`, 10m)

- **Umbral:** > 80 % de conexiones en uso
- **Expresión:** `goblinhub:prisma_pool_saturation > 0.8`

### Causa probable

Límite de conexiones de Supabase alcanzado. `PrismaService` publica
`goblinhub_prisma_pool_connections_in_use` y `_max` (M-11).

### Diagnóstico

1. Grafana → **Pool Prisma (conexiones)**: ver pico y duración.
2. Comprobar si hay muchas peticiones lentas (A-01): conexiones retenidas
   durante mucho tiempo.
3. Revisar tráfico (spike de inscripciones/eventos).

### Mitigación

- Reducir tiempo de retención de conexiones: revisar transacciones largas y
  evitar `await` fuera de transacciones innecesarias.
- Activar PgBouncer en Supabase si es posible (revisar plan de Supabase).
- Escalar horizontalmente **solo** si el cuello de botella es CPU/memoria,
  no el límite de Supabase.

## 11. A-07 — Backup atrasado (`warning`, 1h)

- **Umbral:** > 25 h desde el último éxito (`time() - last_success > 90000 s`)
- **RPO objetivo:** 24 h (margen de 1 h para evitar falsos positivos).
- **Métrica:** `goblinhub_backup_last_success_timestamp_seconds` (M-12),
  publicada por `BackupService` tras cada `pg_dump` exitoso.

### Causa probable

`pg_dump` no está en la imagen (`postgresql-client`), el cron no se ejecutó,
falló la conexión a PostgreSQL o no había espacio en disco.

### Diagnóstico

1. Grafana → **Respaldo (último éxito)**: mostrar timestamp absoluto.
2. Revisar logs del cron de backup (Render/Scheduler o proceso que lo ejecuta).
3. Comprobar que la imagen de Docker incluye `postgresql-client` (ver
   `goblinhub-api/Dockerfile`, etapa runtime).
4. Verificar espacio en disco del contenedor (`/app/backups`).

### Mitigación

- Ejecutar backup manual: `pg_dump "$DATABASE_URL" --format=custom ...`
- Corregir credenciales/privilegios de `DATABASE_URL` para backup (solo
  lectura suficiente).
- Asegurar que `backups/` tiene permisos para el usuario `goblinhub` (uid 1001).

## 12. A-08 — Registros por debajo de lo esperado

**Estado:** no implementada como regla activa (ver comentario en
`goblinhub.yml`). Requiere `postgres_exporter` para evaluar `deriv(N-01[7d])`
sobre `logs_actividad`/usuarios. El panel correspondiente existe en el
tablero como **sección de negocio** (datasource PostgreSQL) y es **informativo**.
No escalar por esta alerta hasta que el datasource de negocio esté activo y la
regla se habilite explícitamente.

## 13. A-09 — Servicio caído (`critical`, 2m)

- **Expresión:** `up{job="goblinhub-api", deployment_environment="production"} == 0`
- **`for`:** 2m
- **Importante:** Prometheus deja de recibir métricas. El resto del tablero
  puede no tener datos recientes.

### Causa probable

Proceso caído, despliegue fallido, sin memoria para arrancar o red entre
Prometheus y Render interrumpida.

### Diagnóstico

1. **Alertmanager UI** (`http://localhost:9093` en local): confirmar el grupo
   y las instancias afectadas.
2. **Prometheus Targets** (`http://localhost:9090/targets`): estado `DOWN` del
   job `goblinhub-api`.
3. **Logs del servicio** (Render): `render logs -s goblinhub-api` (o CLI
   correspondiente). Buscar error de arranque justo antes de la caída.
4. **Healthchecks**: `curl -i https://<api-render>/healthz` y
   `https://<api-render>/health/ready`.

### Mitigación

- Si el error apareció tras un **despliegue**: revertir al commit anterior
  (rollback de Render). No intentar "arreglar en caliente" con cambios no
  probados mientras el servicio está caído.
- Si es falta de memoria: aumentar plan de Render o reducir carga (pero esto
  suele ser síntoma de A-03 no atendida).
- Si es error de configuración (`.env`): corregir en variables de Render
  (Terraform declara las variables; modificar vía Terraform/Render, **nunca**
  hardcodear secretos).

### Notas

- `A-09` se **inhibe** con A-10 en algunos casos? No: son alertas distintas.
  A-09 es "Prometheus no puede sondear" (up==0). A-10 es "la API responde pero
  sus dependencias están caídas" (`goblinhub_health_ready==0`), con lo que `up`
  sigue siendo 1 y A-09 NO dispara. Ese desacoplamiento es deliberado (distintas
  causas).

## 14. A-10 — Dependencia crítica caída (`critical`, 2m)

- **Expresión:** `goblinhub_health_ready{deployment_environment="production"} == 0`
- **`for`:** 2m
- **Métrica:** publicada por `HealthService` (`/health/ready` devuelve 503 con
  detalles cuando alguna dependencia no está `up`).

### Causa probable

PostgreSQL inalcanzable (límite de conexiones de Supabase agotado), Redis
incapaz de responder o timeout de la sonda.

### Diagnóstico

1. Grafana → **Health Ready (gauge)**: debe estar en `1`. Si `0`, abrir
   `/health/ready` directamente: devuelve JSON con `dependencias.postgres.estado`
   y `dependencias.redis.estado` + `latenciaMs`.
2. Comprobar **Pool Prisma** (A-06): si > 80 % sostenido, el cuello de botella
   son conexiones de Supabase.
3. Verificar estado de Supabase (Dashboard de Supabase) y Redis (Render/Upstash).

### Mitigación

- **NO reiniciar en cascada.** Un reinicio de la API no libera conexiones
  "colgadas" en el lado de Supabase; en el peor caso añade nuevas conexiones
  que fallan y prolonga la recuperación.
- Si PostgreSQL tiene muchas conexiones abiertas: esperar a que expiren o
  reducir carga (detener workers, pausar tráfico no crítico). Si hay
  PgBouncer, revisar su pool.
- Si Redis no responde: la API degrada funcionalidad (caché), pero las
  operaciones críticas deben seguir funcionando. Verificar timeout de conexión
  (`REDIS_URL`).
- Corregir la causa raíz (consultas que retienen conexiones: A-01 + A-06).

## 15. A-11 — Latencia P95 crítica (`critical`, 5m)

- **Umbral:** > 2,5 s
- **Expresión:** `goblinhub:http_p95_seconds{deployment_environment="production"} > 2.5`
- **`for`:** 5m (más corto que A-01)

### Causa probable

Dependencia lenta o saturación severa de la base de datos.

### Diagnóstico

1. Grafana → **Latencia por ruta (P95)** + **Pool Prisma** + **CPU/Memoria**.
2. Identificar si la subida es global (todos los endpoints) o una ruta
   concreta (endpoint de reporte/checkout con muchos joins).
3. Comprobar A-06 y A-10 simultáneamente.

### Mitigación

- Si global + A-06: reducir carga (rate limiting efectivo, desactivar jobs
  no críticos).
- Si ruta concreta: desactivar esa funcionalidad temporalmente o aplicar caché
  agresiva (si datos no son en tiempo real).
- Considerar rollback si coincide con despliegue reciente.

## 16. A-12 — Tasa de error 5xx crítica (`critical`, 5m)

- **Umbral:** > 5 % en 5m
- **Expresión:** `goblinhub:http_error_ratio_5m{deployment_environment="production"} > 0.05`

### Causa probable

Fallo generalizado (no puntual). Si se concentra en `/auth`, revisar Supabase
Auth antes que la API.

### Diagnóstico

1. **Top rutas con 5xx** en Grafana.
2. `requestId` en logs para correlacionar errores.
3. A-10 presente → origen en dependencias. A-10 ausente → bug en código.

### Mitigación

- Rollback inmediato si apareció tras despliegue.
- Si Supabase Auth falla: publicar estado y degradar login/registro si es
  posible (no bloquear operaciones internas autenticadas con tokens ya válidos,
  según diseño).
- Activar circuit breaker si hay dependencia externa inestable (futuro).

## 17. A-13 — Error rate extremo (`critical`, 1m)

- **Umbral:** > 20 % en 5m
- **`for`:** 1m (respuesta casi inmediata)
- **Expresión:** `goblinhub:http_error_ratio_5m{deployment_environment="production"} > 0.20`

### Causa probable

Caída total del servicio. En la práctica equivale a A-09, pero A-09 es
"Prometheus no puede sondear" (up==0) mientras que A-13 es "Prometheus **sí**
puede sondear, pero la API devuelve 5xx sistemáticamente" (p.ej. arranca y
falla en bootstrap, o middleware global lanza excepciones para todas las
peticiones).

### Diagnóstico

1. Confirmar `up{job="goblinhub-api"} == 1` (Prometheus sí alcanza) y
   `goblinhub_http_requests_total{status=~"5.."} >> 0` en todas las rutas.
2. `/healthz` puede devolver 200 mientras todas las peticiones HTTP devuelven
   500 (error en interceptor/middleware, no en dependencias de readiness).
3. Revisar logs de arranque y logs de peticiones recientes.

### Mitigación

- Tratar como **incidente de caída total**. Prioridad máxima.
- Rollback inmediato. Si el rollback no resuelve, considerar escalado fuera
  de horario.
- No intentar "depurar con tráfico real": aislar con una sola réplica si
  Render escala.

## 18. A-14 — Métricas sin escribir (disco lleno) (`critical`, 30m)

- **Expresión:**
  `predict_linear(node_filesystem_avail_bytes{mountpoint="/", fstype!=""}[6h], 4*24*3600) < 0`
- **`for`:** 30m
- **Por qué existe:** Si Prometheus deja de escribir en TSDB (disco lleno), **todas
  las alertas quedan mudas**. Esta alerta es deliberadamente "ruidosa" en su
  explicación: su única función es que el **silencio sea visible**.

### Causa probable

Retención de Prometheus demasiado alta para el volumen, logs que no rotan,
backups de TSDB antiguos o volumen pequeño.

### Diagnóstico

1. Grafana → verificar panel de disco del host (node_exporter). Si no hay
   panel, consultar `http://localhost:9090/graph` con la expresión directa.
2. En Prometheus: `prometheus_tsdb_symbol_table_size_bytes`,
   `prometheus_tsdb_wal_size_bytes`, espacio usado en `/prometheus`.
3. Comprobar `PROMETHEUS_RETENTION` y `PROMETHEUS_RETENTION_SIZE` en `.env`
   (por defecto 30d / 10GB).

### Mitigación

1. **Reducir retención** temporalmente: bajar `PROMETHEUS_RETENTION` (p.ej.
   `15d`) y reiniciar Prometheus. Esto reduce el histórico pero **recupera la
   capacidad de alertar** (prioritario sobre conservar histórico).
2. **Expandir volumen** si el entorno lo permite (Render/host).
3. **Limpiar** snapshots antiguos o artefactos fuera de TSDB.
4. **Verificar que las alertas se rearmaron** después de liberar espacio
   (Prometheus vuelve a escribir WAL cuando hay espacio).

### Importante

- Esta alerta usa `node_exporter` sobre el host donde corre Prometheus. En el
  stack local Docker, `node-exporter` monta `/` del host (`/host:ro,rslave`).
  En Render, si Prometheus corre en el mismo servicio, aplica igual. Si corre
  fuera, ajustar el target.
- `fstype!=""` evita duplicados de mountpoints virtuales.

## 19. Inhibición y agrupado

- **Agrupado:** `group_by: [alertname, deployment_environment]`. Una ventana de
  caída con muchas rutas afectadas genera **un único aviso**, no cincuenta.
- **Inhibición:** una alerta con `severity="critical"` silencia a la
  preventiva equivalente (`severity="warning"`) **solo** cuando coinciden
  `alertname` y `deployment_environment`. Esto evita spam cuando una crítica
  engloba a la preventiva (p.ej. A-09 silencia alertas preventivas mientras el
  servicio está caído).

## 20. Silencios (maintenance)

Durante despliegues planificados:

- Silenciar **A-09** (`ServicioCaido`) en el entorno afectado (`production`),
  con comentario que incluya PR/commit y ventana estimada.
- No silenciar A-14 bajo ninguna circunstancia (es el alerta que detecta el
  silencio).
- Usar Alertmanager UI (`/silences`) o API. Registrar el silencio en el
  incidente/PR si aplica.

## 21. Evidencia de alerta (requisito #214)

Para demostrar que el enrutado funciona **sin credenciales reales**:

1. `cd monitoring && cp .env.example .env`
2. Poner `DEPLOY_ENV=production` y `API_TARGET=localhost:3010` (**el valor de
   `DEPLOY_ENV` debe coincidir con el de la API**: las reglas filtran por
   `deployment_environment`, y un stack en `development` no evalua ninguna
   alerta de producción), y `GRAFANA_ADMIN_PASSWORD=...`
3. Poner `ALERTMANAGER_MOCK_WEBHOOK_URL=http://host.docker.internal:9095/alerta`
4. `node scripts/generate-config.mjs` → se genera el receptor `evidencia-prueba`
   con la ruta condicional.
5. `make up-evidencia` (levanta mock-webhook en 9095 + stack)
6. Inyectar la alerta de prueba por la API de Alertmanager:
   ```bash
   NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
   curl -s -X POST http://localhost:9093/api/v2/alerts \
     -H 'Content-Type: application/json' \
     -d "[{\"labels\":{\"alertname\":\"PruebaEvidencia214\",
          \"severity\":\"warning\",\"alerta_prueba\":\"true\",
          \"deployment_environment\":\"production\",\"monitor\":\"goblinhub\"},
          \"annotations\":{\"summary\":\"Alerta de prueba\"},
          \"startsAt\":\"$NOW\",
          \"endsAt\":\"$(date -u -d '+10 minutes' +%Y-%m-%dT%H:%M:%SZ)\"}]"
   ```
7. **Esperar 30–60 s**: `group_wait` son 30 s y la notificación se reintenta
   cada `group_interval`. Comprobar la entrega con
   `docker compose exec mock-webhook cat /tmp/alerta-recibida.json`.
8. Verificar el enrutado en la respuesta: el campo `receiver` del JSON debe ser
   `evidencia-prueba`.
9. **Adjuntar en el PR** el JSON recibido y una captura de
   `http://localhost:9093/#/alerts` como evidencia (T043/T044).

> El receptor `evidencia-prueba` solo aparece cuando la variable tiene valor.
> En producción debe quedar vacía.

### 21.1 Evidencia de una alerta real, no inyectada

Inyectar por la API demuestra el enrutado, pero no que las reglas disparen. Para
demostrar el camino completo (Prometheus → Alertmanager → receptor) hay que
provocar la condición de verdad. Para A-09 basta con parar la API:

```bash
# 1. Con la API sana, A-09 está inactiva:
curl -s 'http://localhost:9090/api/v1/rules' | grep -o '"name":"ServicioCaido"[^}]*'

# 2. Se para la API. `up` pasa a 0 y A-09 dispara a los ~2 min (su `for`).
docker stop <contenedor-de-la-api>

# 3. Se comprueba el disparo y la entrega
curl -s 'http://localhost:9090/api/v1/rules' | grep -o '"name":"ServicioCaido"[^}]*'
curl -s http://localhost:9093/api/v2/alerts | python3 -m json.tool

# 4. Se levanta la API y la alerta se resuelve sola
docker start <contenedor-de-la-api>
```

Se verificó el ciclo completo: con `up=0` la alerta `ServicioCaido` (A-09)
aparece en `firing` en la UI de Alertmanager, y al volver la API la regla pasa a
`inactive` con `health=ok` sin intervención manual.

## 22. Comprobaciones de salud del stack

| Comando | Esperado |
|---|---|
| `curl -s http://localhost:9090/-/healthy` | Prometheus healthy |
| `curl -s http://localhost:9090/-/ready` | Prometheus ready |
| `curl -s http://localhost:9093/-/healthy` | Alertmanager healthy |
| `curl -s http://localhost:3000/api/health` (Grafana) | 200 |
| `docker compose ps` | Todos `running`/`healthy` |

## 23. Troubleshooting común

| Problema | Causa | Solución |
|---|---|---|
| `promtool check config` falla con URL | Usar `API_TARGET=host:puerto`, no URL completa | Corregir `.env` (se cambió en #214) |
| Alertmanager no arranca: `yaml: unmarshal errors` | `inhibit_rules` mal escrito (`inhibition_rules`) | Usar `inhibit_rules` (singular, sin `ion`) |
| Grafana no carga dashboard | Provisioning mal referenciado | Ver `grafana/provisioning/dashboards/dashboard.yml` y JSON en `dashboards/` |
| Targets DOWN con `host.docker.internal` en Linux | Falta `extra_hosts: host-gateway` | `docker-compose.yml` ya lo incluye |
| `node-exporter` no tiene métricas de disco | Montaje `/` con `ro,rslave` | Correcto para solo lectura; A-14 usa `node_filesystem_*` |
| Mock webhook no recibe nada | `ALERTMANAGER_MOCK_WEBHOOK_URL` apunta a host equivocado | Alertmanager ya incluye `extra_hosts: host-gateway`, así que `http://host.docker.internal:9095/alerta` funciona; dentro de la red del stack también vale `http://mock-webhook:9095/alerta` |
| La alerta de prueba no llega al mock | La ruta `evidencia-prueba` iba después de las de `critical`/`warning` | En Alertmanager gana la primera ruta que coincide: la de evidencia va ahora primero, en `alertmanager.yml.template` |
| Una alerta real no aparece en la UI | `up` no lleva `deployment_environment` y A-09 no encuentra serie | `honor_labels: true` + etiqueta estática en el job `goblinhub-api`; sin esto A-09 era inalcanzable |
| El mock no recibe nada aunque la alerta esté `active` | Faltan los 30 s de `group_wait` | Esperar; cada reintento aparece en `docker compose logs alertmanager` |

## 24. Referencias

- Especificación: `specs/005-modulo-metricas-monitoreo/spec.md`
- Plan: `specs/005-modulo-metricas-monitoreo/plan.md`
- Tasks: `specs/005-modulo-metricas-monitoreo/tasks.md`
- SLA: `docs/SLA_METRICAS_Y_PARAMETROS.md`
- Comparativa: `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md`
- Reglas: `monitoring/prometheus/rules/goblinhub.yml`
- Generador: `monitoring/scripts/generate-config.mjs`
- Constitución: `.specify/memory/constitution.md`
