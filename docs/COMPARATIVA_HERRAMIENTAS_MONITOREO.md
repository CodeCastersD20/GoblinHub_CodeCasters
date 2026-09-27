# Comparativa de herramientas de monitoreo y decisión de selección

> **Issue** #210 `[Docs]: Planeación SDD para métricas de monitoreo`
> **Alcance de este documento**: comparar Nagios, Zabbix, Prometheus + Grafana y
> Datadog, y **seleccionar una alternativa** justificando costo, integración,
> alertas y alarmas.
> **Consumidor**: `specs/005-modulo-metricas-monitoreo/plan.md`, que usa la
> herramienta seleccionada como stack del módulo de métricas.
> **Implementación**: issue #214 `[Feature]: Implementar tablero y alertas de métricas`.

---

## 1. Contexto y restricciones que condicionan la elección

La elección no es libre: el proyecto ya tiene límites que hay que respetar. Estos
límites son los que hacen que una opción "mejor" en abstracto pierda.

| # | Restricción | Origen en el repositorio | Efecto sobre la elección |
|---|---|---|---|
| R1 | **Presupuesto cero** para herramientas propietarias | Proyecto académico; `infra/terraform/` solo define free tier de terceros | Descarta modelos de cobro por host o por métrica |
| R2 | **Sin secretos de terceros versionados** | `.specify/memory/constitution.md`, Principio II (Security-First) | Penaliza plataformas SaaS que exigen cuenta y API key |
| R3 | **Backend en NestJS sobre Render** (`plan = "starter"`, siempre activo) | `infra/terraform/main.tf:36-53` | El scrape debe poder hacerse por HTTP sin agente en el host |
| R4 | **Faltan `/metrics` y health checks** | Hallazgo 14 y §7.2 de `docs/BACKEND_REVIEW.md` | Hay que *instrumentar* la app, no solo observarla por fuera |
| R5 | **Reglas de CI obligatorias** (lint, `tsc --noEmit`, build, cobertura, E2E) | Constitución, sección *Quality Gates* | El stack debe validarse dentro del pipeline, no a mano |
| R6 | **Precedente de stack Docker versionado** | `sonarqube/docker-compose.yml` con `${VAR}` y `.env` ignorado | Un `compose` en el repo es un patrón ya aceptado por el equipo |
| R7 | **Equipo de 4 personas** sin rol de SRE | Integrantes: Sadrach34, Alfion72, Ddarielz, AdrianS-127 | La complejidad operativa tiene coste real en tiempo del equipo |

## 2. Criterios de evaluación

Seis criterios ponderados. **En todas las filas, 5 = mejor y 1 = peor**, así que
"complejidad operativa" puntúa 5 cuando la herramienta es simple de operar.

| # | Criterio | Peso | Qué mide exactamente |
|---|---|---|---|
| C1 | Modelado de métricas e histogramas | 20 | ¿Permite calcular P95/P99 de latencia, tasa de error y percentiles sin trucos? |
| C2 | Alertas y canales de notificación | 20 | ¿Reglas expresivas, agrupamiento, silenciamiento, inhibición y envío a correo/Slack/Discord? |
| C3 | Costo total de propiedad | 20 | Licencia **+** infraestructura **+** tiempo del equipo |
| C4 | Complejidad operativa (5 = simple) | 15 | Número de componentes a desplegar, mantener y respaldar |
| C5 | Integración con el stack NestJS + Prisma | 15 | ¿Cuánto código y quéero hay que añadir a la app y al pipeline? |
| C6 | Soporte multi-entorno (dev/staging/prod) | 10 | ¿Permite distinguir entornos en un mismo tablero sin duplicar infraestructura? |

Puntaje total = Σ (calificación × peso), máximo posible 500.

## 3. Matriz de decisión

| Criterio | Peso | Nagios Core | Zabbix | **Prometheus + Grafana** | Datadog |
|---|---|---|---|---|---|
| C1 Modelado e histogramas | 20 | 1 | 3 | **5** | 5 |
| C2 Alertas y canales | 20 | 2 | 4 | **5** | 5 |
| C3 Costo total | 20 | 4 | 4 | **5** | 1 |
| C4 Complejidad operativa | 15 | 2 | 2 | **3** | 5 |
| C5 Integración NestJS/Prisma | 15 | 1 | 2 | **5** | 4 |
| C6 Multi-entorno | 10 | 2 | 3 | **4** | 5 |
| **Total (máx. 500)** | 100 | **205** | **310** | **460** | **405** |
| **Veredicto** | | Descartado | Descartado | **Seleccionada** | Descartada |

> El orden de la tabla no es el orden de preferencia: Datadog (**405**) queda
> segunda, muy por encima de Zabbix. Se descarta por costo (C3 = 1) y por R2, no
> por falta técnica. Decirlo explícitamente evita que la comparación parezca
> amañada.

## 4. Evaluación por opción

### 4.1 Nagios Core — descartado (205/500)

**A favor**
- GPLv2, sin licencia. Fue durante años el estándar de monitoreo y hay
  conocimiento widespread.
- Modelo de plugins muy flexible para checks puntuales: disco, puerto abierto,
  proceso vivo, certificado TLS por expirar.

**En contra (decisivo)**
- **No es un sistema de métricas, es un sistema de checks.** El resultado de cada
  check es PASS/FAIL/UNKNOWN más un valor de *performance data* que se guarda en
  RRD. No hay modelo de series temporales ni histogramas.
- **C1 = 1 porque el P95 de latencia no es una consulta nativa.** Calcular un
  percentil sobre RRD exige un plugin propio vía `check_by_ssh` o una capa
  externa que reinterprete el *performance data*, y la resolución cae a 1 minuto.
  Justo lo que #214 pide medir (latencia) queda fuera.
- **Tasa de error** tampoco es natural: habría que contar fallos con un check
  dedicado leyendo logs, es decir, parsear texto en vez deSTRUCTURADO.
- C2 = 2: el envío de notificaciones es antivirus (`notification plugin` por host
  y servicio) sin correlación entre alertas ni inhibición de una crítica por su
  preventiva.
- C5 = 1: obliga a desplegar un agente o `check_by_ssh` en cada host. En Render no
  hay acceso al host para instalar nada, así que solo quedaría el sondeo externo,
  que es justo lo que no necesitamos.
- Escalado: se documenta que a partir de ~1000 checks Nagios se vuelve inmanejable;
  se trata de un monolito de checks, no de un almacén de métricas.

**Veredicto**: cumple "saber si algo está arriba", no cumple "saber si se está
degradando y quantify cuánto". Eliminado por C1, que es el criterio de mayor peso
junto a alertas.

### 4.2 Zabbix — descartado (310/500)

**A favor**
- GPLv2. Autoinstalable y con descubrimiento automático de métricas.
- Mejor que Nagios en C1: admite JSON *preprocessing* e items dependientes, y
  puede consumir endpoints con formato Prometheus vía HTTP Agent.
- Dashboards y alertas integrados en el mismo producto.

**En contra (decisivo)**
- **Superficie operativa desproporcionada**: hacen falta *server* + *frontend* +
  base de datos (MySQL o PostgreSQL) + agente o *trapper*. Son al menos 3 procesos
  persistentes que respaldar, parchear y monitorear a sí mismos. Contra la
  restricción R7 (equipo de 4 personas sin SRE).
- C5 = 2: para Nginx/Render hay que instalar el agente en el host, que no es
  accesible; la alternativa es un trapper, que obliga a inventar un endpoint
  receptor que no existe.
- C4 = 2: un despliegue operativo de Zabbix no se resuelve en el tiempo de una
  actividad; es un proyecto paralelo.
- Sistema pensado para **inventario y capacidad de hosts**, no para series de
  aplicación de alta cardinalidad por endpoint HTTP.

**Veredicto**: técnicamente más capaz que Nagios, pero paga el modelado de métricas
con una complejidad que el proyecto no puede sostener. Eliminado.

### 4.3 Prometheus + Grafana + Alertmanager — **SELECCIONADA** (460/500)

**A favor**
- **Modelo de datos nativo de series temporales con histogramas y summaries.**
  C1 = 5 porque el percentil es una consulta, no un plugin:
  `histogram_quantile(0.95, sum by (le) (rate(..._bucket[5m])))`. Es
  literalmente el cálculo que #214 pide para latencia.
- **Tasa de error** sale del mismo histograma: un contador con etiquetas
  `status` y `route` convierte "5xx sobre el total" en una expresión directa.
- **Alertmanager** cubre el criterio de #214 con holgura: *grouping* por
  `alertname`, *inhibition* (una crítica silencia a su preventiva) y *silencing*
  para mantenimiento programado. Canales nativos: correo (SMTP), Slack y Discord
  vía *incoming webhook*.
- **C3 = 5**: licencia Apache 2.0, cero costo. La infraestructura es un nodo
  pequeño o un compose local, reutilizando el patrón de `sonarqube/`.
- **C5 = 5**: `prom-client` expone un endpoint HTTP `/metrics`; Prometheus hace
  *pull* por HTTP. **No hay agente que instalar en Render**, lo cual resuelve R3
  de forma limpia. Además las métricas de proceso (CPU, RSS, event loop lag)
  salen gratis con `collectDefaultMetrics()`.
- **C6 = 4**: la separación por entorno se hace con una etiqueta constante
  `deployment_environment` y una variable `$env` en Grafana, sin duplicar stack.
- Ecosistema amplio de *exporters* para lo que venga después: `node_exporter`,
  `postgres_exporter`.

**En contra (se acepta conscientemente)**
- **C4 = 3, el más bajo de las tres de autoservicio**: son tres componentes
  (Prometheus, Grafana, Alertmanager) más la generación de configuración. Se
  mitiga con un `docker-compose.yml` único y un script de arranque.
- **Nodo único, sin HA**: no tolera la caída del propio Prometheus. Aceptable
  para el alcance actual (un solo backend desplegado).
- **Retención local**: el almacenamiento es un volumen y el histórico se pierde al
  recrearlo. Se fija `retention: 30d` y se documenta la ruta de evolución a
  **Mimir/Thanos** si el proyecto crece.
- Prometheus no interpola variables de entorno en `prometheus.yml`. Se resuelve
  con un generador de configuración (detalle en `plan.md`, §7).

**Veredicto**: es la única opción que cubre C1 y C2 —los dos criterios de mayor
peso que corresponden a los objetivos de #214— sin introducir coste, agentes ni
complejidad de plataforma. **Se selecciona.**

### 4.4 Datadog — descartada (405/500)

**A favor**
- La mejor experiencia operativa de las cuatro: nada que desplegar, instalación
  sin agente, APM y trazas integradas, retención de ~15 meses, alertas con muy
  buen diseño. C4 = 5 porque el producto **es** el servicio.
- C1 y C2 = 5: histogramas, percentiles y alertas funcionan de fábrica.

**En contra (decisivo)**
- **C3 = 1 (criterio que más pesa junto a modelado).** El precio se compone de un
  costo por host instrumentado **más** un costo por métrica custom, y las
  métricas de negocio de #210 son las que más fácil multiplican ese segundo
  factor. El *free
  tier* (5 hosts, 10 métricas custom) no alcanza ni para los objetivos de esta
  issue. Es el único criterio donde la opción saca 1, y un solo 1 en un criterio
  de peso 20 ya decide.
- **R2**: exige cuenta, API keys de terceros y que el tráfico de métricas salga de
  la organización. Roza el Principio II de la constitución.
- **Dependencia del proveedor**: el tablero, el historial y las alertas viven
  fuera del repositorio. El equipo no puede versionar ni auditar su propia
  monitorización, lo que rompe la trazabilidad que exige SDD.
- Se descarta también el hecho de que las alertas de Datadog es un modelo
  propietario: las reglas no viven en el repo, solo los umbrales en la UI.

**Veredicto**: es la segunda opción y la técnicamente más completa; se descarta
por costo (R1) y por la dependencia de secretos externos (R2). Si en el futuro el
proyecto tuviera presupuesto, esta comparativa sirve como argumento para
reabrir el debate: la decisión está documentada y es reversible.

## 5. Decisión

> **Se adopta Prometheus + Grafana + Alertmanager como stack del módulo de
> métricas**, desplegado con Docker Compose en `monitoring/`, con la aplicación
> exponiendo `/metrics` mediante `prom-client`.

### 5.1 Por qué esta decisión cubre la issue #214

| Criterio de #214 | Cómo lo cubre la decisión |
|---|---|
| Instrumentar disponibilidad, latencia, tasa de errores y recursos | `up` + histogramas de latencia + contador de 5xx + `collectDefaultMetrics()` |
| Tablero que distingue dev/staging/prod | Etiqueta `deployment_environment` + variable `$env` en Grafana |
| Alertas accionables para caída, latencia y error rate | Reglas PromQL + Alertmanager con grouping e inhibition |
| Alertas con severidad, causa probable y respuesta | Campo `severity` como etiqueta + runbook en `docs/` |
| Documentar variables, endpoints y secretos sin exponerlos | Compose con `${VAR}` y `.env` ignorado, igual que `sonarqube/` |

### 5.2 Alternativas descartadas, para el registro

- **Nagios Core** → check-based, sin P95 ni series temporales (C1 = 1).
- **Zabbix** → modelado adecuado a cambio de una complejidad operativa
  desproporcionada (C4 = 2, C5 = 2).
- **Datadog** → superior en técnica, pero con costo incompatible con R1 y
  secretos de terceros contrarios a R2 (C3 = 1).

## 6. Consecuencias

**Positivas**
- Cero costo de licencia y sin agentes en el host, que es lo único compatible con
  Render (`plan = "starter"`).
- Resuelve el hallazgo 14 de `docs/BACKEND_REVIEW.md` ("Sin health check /
  métricas / tracing") y los puntos 1 y 3 de §7.8 (Monitoreo).
- La configuración es código y puede validarse en CI, lo que respeta R5.

**Negativas / deuda que asumimos**
- Nodo único sin HA y retención local: aceptado, con ruta a Mimir/Thanos.
- Tres componentes que mantener: aceptado, agrupados en un compose.
- Prometheus no interpola variables de entorno: aceptado, con script generador.

**Riesgos**
- Si el proyecto escalara a varias réplicas, las alertas de caída de
  disponibilidad (R7 de `BACKEND_REVIEW.md` §7.3) interpretarían mal `up == 0`
  en réplicas dormidas. Mitigación: `plan = "starter"` en Render, que no suspende
  instancias, y la etiqueta `deployment_environment` para no mezclar entornos.

## 7. Referencias

- `specs/005-modulo-metricas-monitoreo/spec.md` — requisitos y criterios verificables.
- `specs/005-modulo-metricas-monitoreo/plan.md` — catálogos, reglas de alerta y routing.
- `docs/BACKEND_REVIEW.md` §7.4 (Observabilidad) y §7.8 (Monitoreo) — origen del
  hallazgo que motiva esta decisión.
- `.specify/memory/constitution.md` — Principios II (Security-First) y III (Type-Safe).
