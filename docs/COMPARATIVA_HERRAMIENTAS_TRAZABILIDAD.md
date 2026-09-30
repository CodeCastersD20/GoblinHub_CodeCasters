# Comparativa de herramientas de trazabilidad y decisión de selección

> **Issue** #204 `[Feature]: Implementar visor de trazabilidad con logs y tracers`
> **Alcance de este documento**: comparar OpenTelemetry, una implementación
> propia sobre Prisma, la BIT/CD de logs y las plataformas SaaS de APM, y
> **seleccionar una alternativa** justificando costo, integración con el panel
> administrativo y control de datos sensibles.
> **Consumidor**: `specs/006-visor-trazabilidad-logs-tracers/plan.md`, que usa la
> herramienta seleccionada como stack del módulo de trazabilidad.
> **Origen del encargo**: los puntos *Logs* y *Tracing* abiertos de
> `docs/BACKEND_REVIEW.md` §7.4, que la spec 005 dejó registrados como deuda en
> sus tareas T049 y T050.

---

## 1. Contexto y restricciones que condicionan la elección

La issue #204 no pide "trazas" en abstracto: pide **un visor**. La diferencia
importa, porque es lo que separa una opción de otra. Estas son las restricciones
concretas del repositorio que hacen que la opción recomendada por la auditoría
técnica no sea la seleccionada aquí.

| # | Restricción | Origen en el repositorio | Efecto sobre la elección |
|---|---|---|---|
| R1 | **Presupuesto cero** para herramientas propietarias | Proyecto académico; `infra/terraform/` solo define free tier | Descarta plataformas APM de pago |
| R2 | **Sin secretos de terceros versionados** y sin sacar datos de la organización | `.specify/memory/constitution.md`, Principio II | Penaliza APM SaaS que exigen cuenta, API key y envío de tráfico |
| R3 | **El visor debe vivir en el panel administrativo del producto**, no en una UI aparte | Alcance de la #204 y `goblinhub_web/src/pages/admin/` | Es el criterio que más pesa: un tablero externo no es un "visor" del producto |
| R4 | **El backend es un solo proceso** sobre NestJS + Prisma + PostgreSQL | `goblinhub-api/`, `infra/terraform/main.tf` | No hay I/O entre microservicios que justifique un estándar de trazas distribuidas |
| R5 | **Presupuesto de dependencias mínimo** | `snyk/POLITICA.md` y los `overrides` de seguridad de `package.json` | Penaliza agregar 5 paquetes transitivos y un SDK que se inicializa antes del bootstrap |
| R6 | **La base de datos es la fuente de verdad** (Prisma) | Constitución, Principio III | Favorece persistir en Prisma antes que en un almacén paralelo |
| R7 | **Equipos de 4 personas sin rol de SRE** | Integrantes: Sadrach34, Alfion72, Ddarielz, AdrianS-127 | La complejidad operativa tiene coste real en tiempo del equipo |
| R8 | **No se registran secretos ni datos sensibles innecesarios** | Criterio de aceptación explícito de la #204 | Obliga a enmascarar **antes de persistir**, no después de leer |
| R9 | **Los endpoints privados validan JWT y rol `admin`** | Principio II y patrón de `src/modules/logs/interfaces/controllers/log.controller.ts` | El visor hereda los guards existentes en vez de inventar autenticación |

## 2. Criterios de evaluación

Seis criterios ponderados. **En todas las filas, 5 = mejor y 1 = peor**, así que
"complejidad operativa" puntúa 5 cuando el stack es simple de operar.

| # | Criterio | Peso | Qué mide exactamente |
|---|---|---|---|
| C1 | Propagación de correlación de punta a punta | 20 | ¿Un identificador travels con la solicitud y aparece en el log, en la traza y en cada paso interno? |
| C2 | El visor vive en el panel administrativo | 20 | ¿Se consulta con el mismo JWT, el mismo guard y la misma navegación que el resto del panel? |
| C3 | Costo total de propiedad | 15 | Licencia **+** infraestructura **+** tiempo del equipo |
| C4 | Complejidad operativa (5 = simple) | 15 | Número de componentes a desplegar, mantener, respaldar y actualizar |
| C5 | Integración con NestJS + Prisma sin toolar | 15 | ¿Cuánto código y cuántas dependencias hay que añadir, y cuántas pueden romperse sin avisar? |
| C6 | Control de datos sensibles y privacidad | 15 | ¿Dónde se enmascara y quién decide qué se guarda? |

Puntaje total = Σ (calificación × peso), máximo posible 500.

## 3. Matriz de decisión

| Criterio | Peso | OpenTelemetry + Tempo/Jaeger | **Propia (Prisma)** | Logs JSON + Loki | SaaS APM |
|---|---|---|---|---|---|
| C1 Propagación de correlación | 20 | **5** | 4 | 3 | 5 |
| C2 Visor en el panel admin | 20 | 1 | **5** | 4 | 1 |
| C3 Costo total | 15 | 4 | **5** | 5 | 1 |
| C4 Complejidad operativa | 15 | 2 | **5** | 4 | 5 |
| C5 Integración NestJS/Prisma | 15 | 4 | **5** | 4 | 4 |
| C6 Control de datos sensibles | 15 | 3 | **5** | 4 | 1 |
| **Total (máx. 500)** | 100 | **315** | **480** | **395** | **285** |
| **Veredicto** | | Descartada | **Seleccionada** | Descartada | Descartada |

> El orden de la tabla no es el orden de preferencia. **OpenTelemetry (315) es la
> segunda opción técnica** y solo pierde por dos criterios muy concretos: el visor
> quedaría fuera del producto (C2 = 1) y obliga a operar un SDK y un backend
> collector. Decirlo explícitamente evita que la comparación parezca amañada, y
> §6.3 deja escrita la ruta de migración por si el proyecto crece.

## 4. Evaluación por opción

### 4.1 OpenTelemetry + Tempo o Jaeger — descartada (315/500)

Es lo que recomienda `docs/BACKEND_REVIEW.md` §7.4 y lo que dejó pendiente la
tarea T050 de la spec 005. Se descarta con respeto, porque **es la respuesta
correcta para un sistema de microservicios**.

**A favor**
- **C1 = 5, el único 5 de la columna.** La propagación de contexto es un estándar
  abierto (W3C Trace Context) y la instrumentación automática cubre HTTP, NestJS y
  las llamadas salientes sin escribir código propio. La correlación llega a donde
  uno no piensa: dentro de un `pg` o de un cliente HTTP.
- Interoperabilidad real: si mañana hay más servicios, o se adopta un proveedor,
  las trazas exportadas ya están en el formato que todos entienden.
- Ecosistema amplio de instrumentaciones y de backends donde alojar las trazas,
  para no atar el proyecto a un solo proveedor.

**En contra (decisivo)**
- **C2 = 1, el criterio que más pesa junto a la propagación.** El visor sería la
  UI de Jaeger o de Grafana: **otra URL, otro login, otro despliegue**. La issue
  #204 pide un visor *del producto*, con los permisos del panel administrativo, y
  el panel ya tiene la navegación, los guards y la sesión. Montar Jaeger encima
  significa que el administrador tiene dos herramientas abiertas para la misma
  pregunta, y que una de las dos no respeta el RBAC del producto.
- **C4 = 2, el más bajo de las tres de autoservicio.** El SDK se inicializa
  **antes** de `NestFactory.create()` en `src/main.ts`, lo que condiciona todo el
  bootstrap; encima hacen falta un *collector* y un backend de trazas que
  desplegar, respaldar y versionar, contra la restricción R7.
- **C5 = 4, no 5.** El paquete oficial de instrumentación de Prisma asume el
  cliente clásico, y este proyecto usa **Prisma 7 con `@prisma/adapter-pg`**, que
  cambió la arquitectura del cliente. Eso deja las consultas a la base de datos
  fuera de la instrumentación automática y obliga a instrumentarlas a mano: es
  justamente el tramo que más se quiere ver.
- **C6 = 3.** Los spans salen del proceso hacia un backend que hay que operar y
  asegurar por separado. El enmascarado hay que configurarlo en el SDK, y un solo
  atributo sin redactar viaja con el resto. El principio II exige control
  explícito, y un salto a otro sistema amplía la superficie sin necesidad.

**Veredicto**: pierde por C2 y C4, y por C6 en un proyecto donde la sensitive
data todavía no tiene un agregador de logs que la proteja. Se descarta **para
este alcance**, no como mala tecnología. La ruta de vuelta está en §6.3.

### 4.2 Implementación propia sobre Prisma — **SELECCIONADA** (480/500)

Un módulo Nest nuevo que genera un identificador de correlación, lo propaga,
guarda la solicitud y sus pasos internos en dos tablas, y los expone por dos
endpoints que el panel administrativo ya sabe consumir.

**A favor**
- **C2 = 5**: el visor es `GET /traces` y `GET /traces/:correlationId`, protegidos
  con `SupabaseAuthGuard` + `RolesGuard` + `@Roles(RolUsuario.admin)`, exactamente
  como los cuatro endpoints que ya expone el módulo `logs`. Sin sesión nueva, sin
  segundo login, sin superficie de autenticación nueva.
- **C3 = 5 y C4 = 5**: cero dependencias nuevas, cero contenedores, cero procesos
  nuevos. Reutiliza PostgreSQL, que ya está respaldado, y el patrón de cron que ya
  usan el backup y la expiración de eventos para la purga.
- **C5 = 5**: se engancha donde el proyecto ya sabe engancharse, un middleware y
  un interceptor global junto al `ActivityLogInterceptor` existente, con el
  repositorio tras un token de inyección como el `LOG_REPOSITORY` del módulo
  `logs`. Prisma sigue siendo la fuente de verdad (R6).
- **C6 = 5**: el enmascarado ocurre en el servicio de redacción, **antes** de
  escribir, con una lista explícita de claves prohibidas y un test dedicado que
  falla si un secreto llega a la base de datos. Los datos no salen de la
  infraestructura del proyecto.
- **El modelo de datos ya encaja con el estándar**: `Trazas` es un span raíz y
  `Spans` son sus hijos con `parent_id`. Es la misma forma que usa OpenTelemetry,
  lo que hace que §6.3 sea una migración y no un rediseño.

**En contra (se acepta conscientemente)**
- **C1 = 4, no 5.** Se implementa a mano lo que el estándar da hecho. Se acepta
  el `traceparent` entrante (W3C) para interoperar, pero no hay instrumentación
  automática de librerías de terceros, y no la habrá mientras el proyecto tenga
  un solo proceso (R4).
- La instrumentación es explícita: un paso nuevo que nadie registra es un paso
  invisible. Se compensa porque el interceptor HTTP cubre todas las rutas por
  defecto y los spans internos son opcionales.
- La base de datos es también la de negocio, así que el volumen de trazas
  compite con el tráfico real. Se mitiga con muestreo, con un umbral de latencia y
  con la purga por retención, los tres configurables y documentados.

**Veredicto**: es la única opción que cubre C2 con un 5 sin introducir costo,
infraestructura ni una desviación de privacidad. **Se selecciona.**

### 4.3 Logs estructurados con Loki — descartada (395/500)

Es la tarea T049 de la spec 005 y el punto 2 de `docs/BACKEND_REVIEW.md` §7.8.
Se descarta **por sí sola**, no como parte de la decisión.

**A favor**
- C3 y C4 directos: Loki es Apache 2.0 y reutiliza el `docker-compose.yml` que
  la spec 005 ya dejó en `monitoring/`, así que es un datasource más.
- Es la vía canónica hacia logs agregables: el formato JSON con `requestId` es lo
  que hacen todos los agregadores.

**En contra (decisivo)**
- **C1 = 3.** `nestjs-pino` produce un identificador de petición por log, pero no
  produce spans ni pasos internos. **No hay waterfall**: no existe el modelo de
  padre e hijos, que es justo lo que la issue llama "tracers".
- **C2 = 4, y no 5.** Loki se explora desde la UI de Grafana: es el mismo
  problema que en 4.1, mitigado porque Grafana ya está desplegado, pero sigue
  siendo una segunda herramienta para el mismo administrador.
- **C6 = 4.** El `redact` de pino es potente por camino, pero protege los **logs**;
  los atributos de los spans no pasan por él, y quedaría un camino de escritura
  sin el mismo cuidado.

**Veredicto**: resuelve la mitad izquierda del alcance ("registros
estructurados") y ninguna de la derecha ("tracers"). Se descarta como stack de
esta issue y **se conserva como deuda registrada**: sigue siendo la ruta correcta
en el momento en que haya que agregar un agregador de logs de verdad, y no estorba
a la solución elegida.

### 4.4 Plataformas SaaS de APM — descartada (285/500)

Datadog APM, Sentry Performance y New Relic son productos contemporáneos y
similares en este punto: excelente experiencia, sin nada que operar.

**A favor**
- C1 = 5: correlación y waterfall funcional desde el primer día.
- C4 = 5: el producto **es** el servicio, no hay nada que desplegar.

**En contra (decisivo)**
- **C3 = 1 y C6 = 1, los dos criterios que más pesan después del visor.** El
  costo se compone por host instrumentado más una base de eventos, y el *free
  tier* no alcanza para un objetivo de trazabilidad de 7 días. Y sobre todo: los
  spans, las rutas, los identificadores de usuario y las duraciones **salen de la
  organización**, lo que choca de frente con la restricción R2.
- **C2 = 1**: la UI es externa, igual que en 4.1.
- Se descarta también por la misma razón que Datadog en la spec 005: las reglas de
  filtrado, las alertas y los umbrales no viven en el repositorio. El equipo no
  puede versionar ni auditar su propia observabilidad, lo que rompe la
  trazabilidad que exige SDD.

**Veredicto**: técnicamente la más completa y la más cara de justificar. Si el
proyecto tuviera presupuesto, este documento es el argumento para reabrirlo.

## 5. Decisión

> **Se adopta una implementación propia: un identificador de correlación
> propagado por la aplicación, con las trazas y sus pasos internos persistidos en
> Prisma y consultadas desde el panel administrativo mediante `GET /traces` y
> `GET /traces/:correlationId`.**

### 5.1 Por qué esta decisión cubre la issue #204

| Criterio de aceptación | Cómo lo cubre la decisión |
|---|---|
| Cada solicitud tiene identificador correlacionable en logs y trazas | `CorrelationIdMiddleware` genera o propaga `X-Request-Id`, lo publica en `AsyncLocalStorage` y lo escribe en el `datos_extra` del `ActivityLogInterceptor` y en la columna `correlation_id` de la traza |
| Se pueden localizar errores por endpoint y despliegue | Filtros por método, ruta, código de estado y `DEPLOY_ENV` sobre una tabla indexada, ordenadas por fecha descendente |
| No se registran secretos ni datos sensibles innecesarios | `RedactionService` con lista explícita de claves prohibidas y truncado, aplicado **antes** de persistir, con test que falla si un secreto llega a la base |
| Se documentan formato, retención, permisos y parámetros | `docs/TRAZABILIDAD.md` fija el contrato de cabeceras, el esquema, los parámetros, el RBAC y la política de retención |
| Prueba de propagación y evidencia del visor en el PR | Caso Supertest que recorre entrada → log → traza, y captura del visor funcionando |

### 5.2 Alternativas descartadas, para el registro

- **OpenTelemetry + Tempo/Jaeger** → estándar y con la mejor propagación
  (C1 = 5), pero el visor quedaría fuera del producto (C2 = 1) y obliga a operar un
  SDK y un backend de recolección (C4 = 2).
- **Logs JSON + Loki** → resuelve los registros estructurados pero no existe
  modelo de pasos internos ni waterfall (C1 = 3). Se conserva como deuda (T049).
- **SaaS de APM** → superior en experiencia y descartada por costo (C3 = 1) y por
  sacar los datos de la organización (C6 = 1).

## 6. Consecuencias

### 6.1 Positivas

- Cero dependencias nuevas y cero contenedores, coherente con la política de
  dependencias mínimas del repositorio.
- El visor reutiliza la autenticación, el guard de roles y la navegación del panel
  administrativo: **un solo lugar y un solo login** para el administrador.
- El identificador de correlación también queda disponible para los cron, que hoy
  no pasan por ningún interceptor y por eso son invisibles.
- La instrumentación es explícita y auditable: se sabe exactamente qué se guarda y
  qué no, porque está en el código y en el test.

### 6.2 Negativas / deuda que asumimos

- **Se pierde la instrumentación automática de librerías de terceros.** Se acepta
  mientras el proyecto tenga un solo proceso (R4); cuando tenga más, la ruta está
  abierta en §6.3.
- **La base de datos de negocio también guarda las trazas.** El volumen compite
  con el tráfico real, así que muestreo, umbral de latencia y purga por retención
  son obligatorios desde el primer día, no una optimización posterior.
- **El logging estructurado global sigue pendiente** (T049 de la spec 005). Esta
  issue entrega correlación y trazas, no un agregador de logs.
- **Sin trazas de llamadas salientes a Supabase Auth.** El `SupabaseAuthGuard`
  queda dentro del span raíz, pero la llamada de red en sí no se descompone.

### 6.3 Ruta de migración si el proyecto crece

El modelo elegido no bloquea la adoptación de OpenTelemetry, y esa es la razón
principal para elegirlo: **`Trazas` es un span raíz y `Spans` son sus hijos con
`parent_id`, la misma forma del modelo de datos de OpenTelemetry.** La columna
`servicio` y el filtro homónimo de `GET /traces` ya forman parte del contrato
aunque hoy haya un solo proceso, precisamente para que la llegada de un segundo
servicio no obligue a cambiarlo. Cuando se justifique —más de un servicio, o un
agregador de logs que exija el formato estándar— la migración consiste en:

1. Añadir el SDK y el exportador, y dejar de escribir las tablas a mano.
2. Servir la consulta del visor contra el backend de trazas, conservando el mismo
   contrato de `GET /traces` y `GET /traces/:correlationId` para que **el
   frontend no cambie**.
3. Retener las tablas solo si se quieren los datos anteriores a la fecha de corte.

El identificador de correlación acepta el `traceparent` del estándar W3C Trace
Context, que es lo que permite correlacionar entre procesos el día que exista el
segundo. El contrato de los endpoints es la pieza que hay que proteger para que
esto sea una migración y no un rediseño.

### 6.4 Riesgos

- **Abuso de la traza como almacén de datos.** Si alguien guarda el cuerpo de la
  petición en los atributos del span, la base de negocio se llena. Mitigación: el
  servicio de redacción tiene una lista **por defecto**, no una por añadir, y el
  truncado limita el tamaño de cada valor.
- **Fuga por la ruta.** La ruta normalizada sustituye a los identificadores
  dinámicos para no dispersar la cardinalidad ni dejar identificadores de recurso
  en la base. La normalización se documenta y se prueba.
- **Crecimiento sin purga.** Si el cron de retención no corre, la tabla crece sin
  freno. Mitigación: retención con valor por defecto, prueba del caso de purga y
  el umbral documentado en `docs/TRAZABILIDAD.md`.

## 7. Solución frente al caso de estudio

> **Alcance**: criterio de aceptación de la issue #207 — justificar la solución
> de logs estructurados y tracers frente al caso de estudio. La fuente de las
> restricciones es `docs/SLA_METRICAS_Y_PARAMETROS.md` §2 (contexto y capacidad
> del equipo) y su catálogo de SLA (§4). Las alternativas ya están evaluadas en
> §3 y §4; aquí solo se cruza la decisión con ese caso.

| Restricción del caso de estudio (SLA §2) | Exigencia | Cómo lo cumple la solución seleccionada |
|---|---|---|
| Equipo de 4 integrantes sin guardia nocturna | Ninguna pieza nueva puede exigir operación continuada | Cero componentes nuevos: no hay *collector*, contenedor ni servicio que vigilar; la purga es un cron del propio proceso (§4.2) |
| Render plan `starter` con **un solo servicio web activo** | No hay dónde desplegar un backend de trazas (Tempo/Jaeger) ni un agregador (Loki) sin un servicio más que pagar y respaldar | Todo corre dentro de la API existente; es la razón operativa detrás del descarte de §4.1 y §4.3 |
| PostgreSQL único, respaldo diario, **RPO 24 h** | Los datos con los que se diagnostica un incidente tienen que estar respaldados y ser restaurables | Las trazas viven en la base que ya se respalda; un almacén paralelo habría añadido datos **fuera** del respaldo (restricción R6) |
| Sin APM ni monitor externo; la observabilidad se mide a partir de #214 | La solución no puede depender de un proveedor externo ni sacar datos de la organización (restricción R2) | Implementación propia versionada en el repositorio; nada sale de la infraestructura del proyecto |
| **S4** (tasa de error 5xx < 0,5 %) se remedia con «log de error con `correlationId`» (SLA §4) | El identificador de correlación tiene que existir en el log **y** en la traza | `FR-001`–`FR-006`: el mismo `X-Request-Id` aparece en la respuesta, en `datos_extra` del log de actividad y en `correlation_id` de la traza |
| **S9–S11**: pipeline verde, cobertura ≥ 80 %, 0 vulnerabilidades `critical` | Todo cambio pasa por los gates sin excepción | El módulo entra en `api.yml`/`web.yml` y en la cobertura de Jest (T074), y **no añade dependencias**, así que S11 no cambia; el encaje está en `specs/006-visor-trazabilidad-logs-tracers/plan.md` § *Integración con el pipeline y con el monitoreo* |
| Gobierno SDD: toda desviación se documenta (SLA §2) | La elección frente a la recomendación de la auditoría debe justificarse | Este documento (§3–§6) y el *Complexity Tracking* de `specs/006-…/plan.md` |

**Logs estructurados y tracers, en términos del caso de estudio**

- **Logs estructurados**: la correlación se inyecta en el log de actividad que
  ya escribe el backend (`FR-005`), sin cambiar el formato de toda la
  superficie de `Logger`. Es lo que el caso de estudio exige para remediar
  S4; la migración completa a `nestjs-pino` queda como deuda declarada
  (T049, §4.3).
- **Tracers**: los spans aportan el desglose de pasos que un log plano no
  puede dar —§4.3 descarta Loki porque no produce *waterfall*— y el visor los
  presenta dentro del panel, con el RBAC y el login que el caso de estudio ya
  tiene (R3).
- **Por qué ninguna otra opción**: Loki exige un contenedor más frente a un
  Render que solo admite un servicio activo; OpenTelemetry, un SDK más un
  *collector* (§4.1); un SaaS de APM, sacar trazas e identificadores de
  usuario fuera de la organización (R2). Las tres chocan con una restricción
  del caso de estudio, no solo con una preferencia técnica.

**Conclusión**: la implementación propia es la única opción que cumple el par
«logs estructurados + tracers» sin añadir infraestructura ni coste, y su deuda
—logging estructurado global (T049) y ruta hacia OpenTelemetry (§6.3)— queda
escrita para reabrir el tema cuando cambie el caso, por ejemplo con un segundo
servicio.

## 8. Referencias

- `specs/006-visor-trazabilidad-logs-tracers/spec.md` — requisitos y criterios
  verificables.
- `specs/006-visor-trazabilidad-logs-tracers/plan.md` — estructura, contratos y
  desviaciones de la constitución.
- `specs/005-modulo-metricas-monitoreo/tasks.md` T049 y T050 — la deuda que esta
  issue asume y la que deja abierta.
- `docs/BACKEND_REVIEW.md` §7.4 (Observabilidad) y §7.8 (Monitoreo) — origen de la
  recomendación de OpenTelemetry que aquí se matiza.
- `docs/COMPARATIVA_HERRAMIENTAS_MONITOREO.md` — precedente del método: matriz
  ponderada, veredicto por opción y ruta de reopening.
- `.specify/memory/constitution.md` — Principios II (Security-First), III
  (Type-Safe) y IV (Modular Single-Responsibility).
