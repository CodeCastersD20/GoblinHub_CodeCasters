# Feature Specification: Módulo de métricas de monitoreo (Prometheus + Grafana + Alertmanager)

**Feature Branch**: `docs/210-planeacion-sdd-metricas-monitoreo` (planeación) →
`feat/214-tablero-y-alertas-de-metricas` (implementación)

**Created**: 2026-09-26

**Status**: Draft — planeación de #210; implementación en #214

**Input**: User description: "/speckit.specify Módulo de métricas para monitorear la
aplicación: instrumentar disponibilidad, latencia, tasa de errores y uso de
recursos, con tablero por entorno (desarrollo, staging, producción) y alertas
accionables de caída, latencia y error rate."

**Decisión de stack**: Prometheus + Grafana + Alertmanager, justificada en
`docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md` (issue #210).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Métricas técnicas expuestas por la API (Priority: P1)

Como desarrollador, la API expone en un formato estándar las métricas de
disponibilidad, latencia, tasa de errores y uso de recursos, sin alterar el
contrato de los endpoints de negocio.

**Why this priority**: Es el prerrequisito bloqueante de todo lo demás. Sin
`/metrics` no hay tablero ni alerta posible; es el hallazgo 14 de
`docs/BACKEND_REVIEW.md` y el punto 1 de §7.8.

**Independent Test**: Con la API levantada, `curl -s localhost:3000/metrics`
devuelve las cuatro familias de métricas en formato de exposición de Prometheus.

**Acceptance Scenarios**:

1. **Given** la API levantada, **When** se solicita `GET /metrics`, **Then** responde `200` con `Content-Type` de exposición de Prometheus.
2. **Given** una petición a un endpoint de negocio, **When** se completa, **Then** se incrementa un contador etiquetado con método, ruta y código de estado.
3. **Given** las métricas de proceso de Node.js, **When** se consultan, **Then** están presentes CPU, memoria residente y event loop lag.
4. **Given** las respuestas de negocio existentes (productos, eventos, autenticación), **When** se comparan antes y después del cambio, **Then** el contrato no varía.

**Trazabilidad**: cubre el AC «Se instrumentan disponibilidad, latencia, tasa de errores y recursos» de #214.

---

### User Story 2 - Tablero que distingue entornos (Priority: P1)

Como operador, puedo abrir un tablero único y ver las métricas técnicos
seleccionando el entorno: desarrollo, staging o producción.

**Why this priority**: Es el criterio que impide que un tablero sea ambiguo: sin
etiqueta de entorno, un pico de staging se lee como una caída de producción y se
responde al revés.

**Independent Test**: Con el stack levantado, el tablero carga con la variable
`$env` y cambiar su valor entre `development`, `staging` y `production` cambia las
series consultadas, sin recargar ni reconstruir el tablero.

**Acceptance Scenarios**:

1. **Given** el stack de monitoreo levantado, **When** se abre el tablero, **Then** muestra paneles de disponibilidad, latencia P95, tasa de error y recursos.
2. **Given** la variable `$env` en `development`, **When** se cambia a `production`, **Then** todas las series consultan exclusivamente series etiquetadas con ese entorno.
3. **Given** métricas de dos entornos, **When** se inspecciona la consulta de un panel, **Then** incluye el filtro `deployment_environment`.

**Trazabilidad**: cubre el AC «El tablero permite distinguir desarrollo, staging y producción» de #214.

---

### User Story 3 - Alertas accionables de caída, latencia y error rate (Priority: P1)

Como operador, recibo una alerta cuando el servicio cae, cuando la latencia se
degrada o cuando sube la tasa de errores.

**Why this priority**: Es el objetivo declarado de la issue #214: detectar
degradaciones **antes** de que las reporte un usuario.

**Independent Test**: `promtool check rules` valida el fichero de reglas sin
error, y una regla disparada de prueba llega al receptor configurado.

**Acceptance Scenarios**:

1. **Given** la API caída, **When** Prometheus no logra recopilar métricas durante 2 minutos, **Then** se dispara la alerta crítica de caída con severidad `critical`.
2. **Given** latencia P95 sostenida por encima del umbral, **When** se cumple la ventana `for` de la regla, **Then** se dispara la alerta de latencia.
3. **Given** una proporción sostenida de respuestas 5xx, **When** se cumple la ventana `for`, **Then** se dispara la alerta de tasa de error.
4. **Given** varias alertas de la misma familia, **When** ocurren a la vez, **Then** Alertmanager las agrupa en una sola notificación.
5. **Given** una alerta preventiva y su equivalente crítica, **When** la crítica está activa, **Then** la preventiva queda inhibida.

**Trazabilidad**: cubre el AC «Existen alertas accionables para caída, latencia y error rate» de #214.

---

### User Story 4 - Alertas con severidad, causa probable y respuesta (Priority: P2)

Como operador, cada alerta que recibo indica su severidad, la causa probable y el
procedimiento a seguir para responder.

**Why this priority**: Una alerta sin respuesta documentada genera ruido: el
equipo la ignora y el sistema de monitoreo pierde credibilidad. Es el criterio
que distingue este trabajo de un simple `uptime check`.

**Independent Test**: La definición de cada alerta incluye los campos de
severidad, causa probable y referencia al runbook, y el runbook tiene una sección
por alerta.

**Acceptance Scenarios**:

1. **Given** una alerta recibida, **When** se lee su definición, **Then** expone la etiqueta `severity` (`warning` o `critical`).
2. **Given** una alerta recibida, **When** se consulta su anotación, **Then** indica la causa probable del evento.
3. **Given** una alerta recibida, **When** se sigue el enlace de respuesta, **Then** el runbook describe los pasos a ejecutar.

**Trazabilidad**: cubre el AC «Las alertas indican severidad, causa probable y procedimiento de respuesta» de #214.

---

### User Story 5 - Configuración versionada sin secretos expuestos (Priority: P2)

Como equipo, la configuración del stack de monitoreo vive en el repositorio
como código, y ninguna credencial queda versionada: todo secreto viaja por
variable de entorno o fichero ignorado por git.

**Why this priority**: Es un requisito de la constitución (Principio II,
Security-First) y el criterio explícito de #214. Además es lo que permite
validar la configuración en CI.

**Independent Test**: `git grep` no encuentra ningún valor sensible en el árbol,
y la configuración se genera a partir de variables documentadas.

**Acceptance Scenarios**:

1. **Given** el repositorio completo, **When** se buscan secretos de monitoreo, **Then** no hay ninguno versionado; solo nombres de variables.
2. **Given** un `.env.example` del stack, **When** se lee, **Then** enumera todas las variables necesarias con su propósito.
3. **Given** la configuración de Prometheus y Alertmanager, **When** se regenera, **Then** se produce desde variables documentadas, sin editar el fichero a mano.
4. **Given** el pipeline, **When** se ejecuta la validación de la configuración de monitoreo, **Then** falla si una regla es inválida.

**Trazabilidad**: cubre el AC «Se documentan variables, endpoints, credenciales/secretos y parámetros sin exponer secretos» de #214 y el Principio II.

---

### User Story 6 - Métricas de negocio sin código nuevo (Priority: P3)

Como equipo, las métricas de negocio —registros por día, eventos creados,
conversión inscripción→asistencia y ocupación de cupos— son visibles en el mismo
tablero sin escribir un collector nuevo en el backend.

**Why this priority**: Es alcance propio de #210 («métricas técnicas y de
negocio») y aporta valor sin coste, pero no bloquea la detección de degradaciones,
por eso va después de US1–US3.

**Independent Test**: El datasource de negocio responde consultas sobre las
tablas existentes y los paneles correspondientes renderizan valores.

**Acceptance Scenarios**:

1. **Given** un datasource de solo lectura sobre la base de datos, **When** se ejecuta una consulta de agregados, **Then** devuelve series temporales.
2. **Given** el tablero, **When** se abre la sección de negocio, **Then** muestra registros, eventos, conversión y ocupación.
3. **Given** el requisito de no escribir código nuevo, **When** se revisa el diff del backend, **Then** no contiene collectors de negocio.

**Trazabilidad**: cubre el alcance «Definir métricas técnicas y de negocio» de #210.

---

### User Story 7 - Evidencia de una prueba de alerta (Priority: P3)

Como equipo, el PR de implementación adjunta la evidencia de una alerta real
disparada y verificada, no solo la definición de la regla.

**Why this priority**: Es el criterio de cierre de #214 y es lo que distingue una
alerta verificada de una configurada. No bloquea el diseño, pero sí el cierre.

**Independent Test**: El PR contiene el adjunto de la alerta disparada con su
severidad, su causa y el resultado de la verificación.

**Acceptance Scenarios**:

1. **Given** el stack levantado en local, **When** se provoca la condición (por ejemplo, una respuesta 5xx sostenida), **Then** la alerta se dispara y llega al receptor configurado.
2. **Given** la alerta disparada, **When** se adjunta al PR, **Then** la evidencia identifica la regla, la severidad y la causa probable.
3. **Given** la evidencia adjunta, **When** se revisa la trazabilidad, **Then** la alerta probada corresponde a una de las tres familias del AC de #214.

**Trazabilidad**: cubre el AC «Se adjunta evidencia de una prueba de alerta y su PR» de #214.

### Edge Cases

- **Métricas por entorno mezcladas** → toda métrica lleva la etiqueta constante
  `deployment_environment`; si falta, la serie no aparece en el tablero.
- **Alerta de caída y alerta de latencia son dos reglas distintas** → #214 exige
  alerta de caída, latencia y error rate. La caída se mide con `up`; la latencia,
  con el histograma. Se documentan por separado y no se fusionan en una sola.
- **Sin tráfico en horario valle** → una alerta de throughput cero dispara
  falsos positivos de madrugada. El umbral de throughput se marca como
  *informativa* hasta que exista un calendario de tráfico por franja horaria.
- **Instancia dormida de Render** → el plan `starter` (`infra/terraform/main.tf:38`)
  no suspende instancias, así que `up == 0` sí significa caída real. Si algún día
  se migra a plan gratuito, esa alerta habría que reclasificar a preventiva.
- **Alta cardinalidad de la etiqueta de ruta** → etiquetar con la ruta literal
  (`/productos/:id`) crearía series sin límite. Se usa el patrón de ruta con
  comodín y se normalizan los identificadores.
- **Pérdida del histórico de Prometheus** → el almacenamiento es local. Se fija
  retención de 30 días y se documenta la ruta a Mimir/Thanos.
- **Dependencia caída pero proceso vivo** → `/healthz` devuelve 200 si el proceso
  arrancó, pero `/health/ready` falla si PostgreSQL no responde. La alerta de
  caída usa readiness, no liveness, para no reiniciar en cascada.
- **Regla que dispara por un único request fallido** → todas las reglas de error
  usan `rate(...[5m])` con ventana `for`, nunca un contador instantáneo.

## Requirements *(mandatory)*

### Technical Metrics

- **FR-001**: La API DEBE exponer `GET /metrics` en formato de exposición de Prometheus, usando `prom-client`.
- **FR-002**: La API DEBE exponer un contador de peticiones etiquetado al menos por `method`, `route` y `status`, usando la ruta con comodín (`/productos/:id`) para acotar cardinalidad.
- **FR-003**: La API DEBE exponer un histograma de latencia en segundos con buckets definidos, a partir del cual se calculan P50, P95 y P99.
- **FR-004**: La API DEBE exponer las métricas de proceso de Node.js (CPU, memoria residente, event loop lag) mediante `collectDefaultMetrics()`.
- **FR-005**: La API DEBE exponer un medidor de antigüedad del último backup exitoso, dado que hoy el cron solo registra el resultado en logs (hallazgo de `BACKEND_REVIEW.md` §7.4).
- **FR-006**: Toda métrica DEBE llevar la etiqueta constante `deployment_environment` con el valor de la variable de entorno `DEPLOY_ENV`.
- **FR-007**: La API DEBE exponer `GET /healthz` (liveness) y `GET /health/ready` (readiness) que verifica la conexión a PostgreSQL, para distinguir proceso vivo de proceso capaz de atender tráfico (`BACKEND_REVIEW.md` §7.2 y §7.5).
- **FR-008**: La exposición de métricas NO DEBE alterar el contrato de los endpoints de negocio, ni el código de respuesta, ni los cuerpos de respuesta existentes.

### Dashboard

- **FR-009**: DEBE existir un tablero que muestre, en paneles separados, disponibilidad, latencia P95, tasa de error, throughput y uso de recursos.
- **FR-010**: El tablero DEBE permitir filtrar por entorno (`development`, `staging`, `production`) mediante una variable, y todas sus consultas DEBEN filtrar por la etiqueta `deployment_environment`.
- **FR-011**: El tablero DEBE ser provisionado automáticamente desde ficheros de configuración versionados, sin necesidad de recrearlo a mano en la UI.

### Alerts

- **FR-012**: DEBEN existir reglas de alerta para caída del servicio, degradación de latencia y aumento de la tasa de error, cada una con su expresión PromQL, su ventana `for` y su etiqueta `severity`.
- **FR-013**: DEBEN existir dos niveles de severidad, `warning` (preventiva) y `critical` (crítica), con umbrales distintos por métrica.
- **FR-014**: Cada métrica del catálogo DEBE declarar su umbral, unidad, fuente y acción asociada.
- **FR-015**: Cada alerta DEBE declarar su causa probable y referenciar el procedimiento de respuesta en el runbook.
- **FR-016**: La configuración de Alertmanager DEBE definir agrupación por alerta y entorno, e inhibición de la alerta preventiva cuando existe su equivalente crítica.
- **FR-017**: La configuración de Alertmanager DEBE soportar canales de correo, Slack y Discord, con los valores inyectados por variable de entorno.

### Business Metrics

- **FR-018**: DEBEN definirse las métricas de negocio de **#210**: disponibilidad, latencia, errores, uso de recursos y throughput, y además registros por día, eventos creados, conversión inscripción→asistencia y ocupación de cupos.
- **FR-019**: Las métricas de negocio DEBEN obtenerse de un datasource de solo lectura sobre la base de datos existente, sin añadir collectors al backend.

### Configuration and Security

- **FR-020**: La configuración del stack DEBE vivir en el repositorio como código y ser reproducible desde un único comando documentado.
- **FR-021**: Ningún secreto (SMTP, *incoming webhooks*, credenciales de base de datos, contraseña de administration de Grafana) DEBE estar versionado; todos DEBEN inyectarse por variable de entorno o fichero ignorado por git.
- **FR-022**: DEBE existir un `.env.example` del stack que enumere cada variable con su propósito, y su `.env` real DEBE estar ignorado por git.
- **FR-023**: El pipeline DEBE validar la configuración de monitoreo (reglas y targets) y fallar si alguna regla es inválida.
- **FR-024**: DEBE existir un runbook que documente el procedimiento de respuesta para cada familia de alerta, dirigido al equipo de Sadrach34, Alfion72, Ddarielz y AdrianS-127.

### Verification

- **FR-025**: El PR de implementación DEBE adjuntar la evidencia de una alerta disparada y verificada, con su severidad y causa probable.

### Key Entities

- **Métrica técnica**: contador, histograma o medidor expuesto en `/metrics`
  (disponibilidad, latencia, error rate, throughput, CPU, memoria, event loop lag,
  pool de Prisma, última copia de seguridad).
- **Métrica de negocio**: serie agregada desde las tablas existentes (usuarios,
  eventos, inscripciones, asistencia, cupos).
- **Regla de alerta**: expresión PromQL con `for`, `labels` (`severity`,
  `deployment_environment`, `alertname`) y `annotations` (`summary`, `cause`,
  `runbook`).
- **Regla de enrutado**: coincidencia de etiqueta que decide qué receptor entrega
  la notificación.
- **Receptor**: destino de la notificación (correo, Slack, Discord), definido en
  `alertmanager.yml` con valores por variable de entorno.
- **Entorno**: `development`, `staging` o `production`, portado por la etiqueta
  `deployment_environment`.
- **Runbook**: documento con el procedimiento de respuesta por familia de alerta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET /metrics` devuelve las cuatro familias técnicas: disponibilidad, latencia (con histograma), tasa de error y recursos (`process_cpu`, `process_resident_memory`, `nodejs_eventloop_lag`).
- **SC-002**: El tablero carga y distingue los tres entornos sin duplicar infraestructura, verificado cambiando el valor de `$env`.
- **SC-003**: `promtool check rules` valida el fichero de reglas sin errores, y las tres familias de alerta del AC de #214 existen en configuración.
- **SC-004**: El 100 % de las alertas definidas declaran severidad, causa probable y enlace al runbook.
- **SC-005**: `git grep` no encuentra ningún secreto en el árbol; el `.env.example` documenta todas las variables.
- **SC-006**: La evidencia de una alerta disparada queda adjunta al PR de implementación.
- **SC-007**: El catálogo de métricas técnicas y de negocio está completo en `plan.md` con umbral, unidad, fuente y acción por métrica.

## Out of Scope

- **Distributed tracing** (OpenTelemetry): el hallazgo de `BACKEND_REVIEW.md` §7.4
  lo menciona, pero no es necesario para las cuatro métricas que pide #214.
- **Almacenamiento de largo plazo** (Mimir/Thanos): se documenta como ruta de
  evolución, no se despliega.
- **Logs estructurados** con `nestjs-pino`: es el punto 2 de §7.8 y un módulo
  aparte; este spec solo deja constancia de la métrica de backup.
- **Alertas de infraestructura de terceros** (Supabase, Render): fuera del
  alcance; este módulo observa el backend de GoblinHub.
- **Escalado horizontal**: la plataforma objetivo sigue siendo un backend, sin
  escalado automático. El stack no se prepara para ello.

## Dependencies

- **Issue #210** (este spec): comparación y selección de la herramienta.
- **Issue #214**: implementación de este spec.
- `infra/terraform/main.tf:44` ya declara `health_check_path = "/healthz"`, que
  hoy **no existe** en la API: `FR-007` cierra esa inconsistencia.
- `goblinhub-api/scripts/deploy/healthcheck.sh` ya consulta `$HEALTHCHECK_URL`
  con la misma expectativa.

## Assumptions

- La API se despliega en Render con plan `starter`, siempre activo, sin suspensión
  de instancias, por lo que `up == 0` es una caída real.
- Se asume que el equipo tiene acceso a un buzón SMTP y, si lo desea, a un canal
  de Slack o Discord; si no se configura ninguno, las alertas quedan visibles
  únicamente en la UI de Alertmanager y en el tablero.
- Se asume que existe un rol de base de datos de solo lectura para el datasource
  de negocio, creado fuera del repositorio.
- No se ejecutan despliegues reales en la nube como parte de la verificación: la
  evidencia de #214 se produce levantando el stack en local.
- El histological de métricas no es un requisito de negocio en esta iteración; la
  retención de 30 días es suficiente.
