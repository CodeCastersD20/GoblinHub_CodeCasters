# Implementation Plan: Visor de trazabilidad con logs y tracers

**Branch**: `doc/207-docs-planeación-sdd-del-visor-de-trazabilidad` (planeación) → `feat/204-feature-implementar-visor-de-trazabilidad-con-logs-y-tracers` (implementación) | **Date**: 2026-09-29 | **Spec**: `specs/006-visor-trazabilidad-logs-tracers/spec.md`

**Input**: Feature specification from
`/specs/006-visor-trazabilidad-logs-tracers/spec.md`

**Decisión de stack**: implementación propia sobre Prisma, seleccionada en
`docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`. Esta decisión **se aparta de la
recomendación de OpenTelemetry** de `docs/BACKEND_REVIEW.md` §7.4, y la
desviación queda registrada en *Complexity Tracking* más abajo, con la ruta de
vuelta en `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` §6.3.

## Summary

Hoy el backend solo escribe texto plano con `Logger` de Nest, sin ningún
identificador que una una petición con sus registros ni con sus consultas a la
base de datos. Un incidente obliga a leer cientos de líneas sueltas y reconstruir
el flujo a mano (`docs/BACKEND_REVIEW.md` §7.4, puntos *Logs* y *Tracing*). La
spec 005 registró esa deuda como tareas T049 y T050, fuera del alcance de #214;
esta issue la recoge.

El plan añade un módulo `tracing` que (1) genera o propaga un identificador de
correlación en cada petición, lo publica para el resto de la aplicación y lo
devuelve en la respuesta; (2) persiste la solicitud y sus pasos internos en dos
tablas de Prisma, aplicando redacción de datos sensibles **en el punto de
escritura**; (3) expone la consulta de trazas con filtros por servicio, método,
ruta, estado, entorno y periodo, protegida con el guard de rol `admin` que ya usa
el módulo `logs`; (4) define el nivel de log y el periodo de retención, y purga lo
que supere ese periodo; y (5) añade una vista propia de trazabilidad al panel de
administración, con los pasos anidados presentados con los estilos que ya están
en el repositorio.

**No se instalan dependencias nuevas ni contenedores.** Es una decisión
deliberada, argumentada en `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`, y es
la razón por la que el módulo se apoya en las piezas que el proyecto ya tiene:
Prisma, los guards de Supabase Auth, el interceptor global de logs y el panel
administrativo.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre NestJS 11 (API) y React 19 + Vite
(frontend); Node 20

**Primary Dependencies**: **ninguna nueva**. Se reutiliza `@nestjs/common`
(middleware, interceptores, `Logger`), `@nestjs/core` (`APP_INTERCEPTOR`),
`@nestjs/schedule` (cron de purga, como `backup.scheduler.ts` y
`event-expiration.scheduler.ts`), `@prisma/client` 7 con `@prisma/adapter-pg`,
`class-validator`, `@nestjs/swagger`, `ioredis` y `axios` en el frontend. Para la
correlación se usa `node:async_hooks`, que forma parte del runtime de Node.

**Storage**: PostgreSQL de Supabase mediante Prisma, **la misma base de datos de
negocio**. Dos modelos nuevos, `Trazas` y `Spans`. El volumen se acota con el
nivel mínimo de log que se persiste y con la purga por retención, los dos
configurables por entorno.

**Testing**: Jest con `ts-jest` (unitarios, siguiendo el patrón de instanciación
directa con `as unknown as` y `jest.mock` de factories de `health.service.spec.ts`),
Supertest con `test/jest-e2e.json` para las pruebas de permisos y de propagación, y
Vitest con Testing Library en el frontend (patrón `vi.mock` del servicio más
`MemoryRouter`, como `products.test.tsx`). El comando de cobertura de Jest se
amplía para incluir este módulo.

**Target Platform**: Contenedor Node sobre Render (`plan = "starter"`), con
`infra/terraform/main.tf` como descriptor. La aplicación web se sirve como SPA
estática.

**Project Type**: monorepo de dos aplicaciones (API NestJS + SPA React) con
especificación dirigida por Spec Kit.

**Performance Goals**: la instrumentación no DEBE añadir más de 5 ms de latencia
por petición en el camino caliente (`FR-010` exige que un fallo al guardar la
traza no altere la respuesta). La escritura de la traza DEBE ser asíncrona y
descartable. La consulta de la lista DEBE paginar y no recorrer la tabla completa
(`FR-011`).

**Constraints**: sin dependencias nuevas; la base de datos es también la de
negocio, así que el crecimiento de las tablas es un riesgo de primer orden;
`npm run api` (lint, `tsc --noEmit`, build, cobertura) y `npm run web` son gates
obligatorios; el tamaño de página está acotado para no permitir consultas que
agoten la base.

**Scale/Scope**: un backend de un solo proceso; un panel administrativo con cinco
vistas (`/admin`, `/admin/logs`, `/admin/trazas`, `/admin/eventos`,
`/admin/usuarios`); dos modelos de datos nuevos; dos endpoints; cuatro historias
P1 y tres P2.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplicación en esta feature | Gate |
|---|---|---|
| **I. Test-First** (no negociable) | Las tareas de `tasks.md` de cada historia de usuario se escriben **antes** que las de implementación, y el PR incluye la prueba de propagación que exige la issue. Las historias 1, 2, 3 y 4 son P1 con sus pruebas escritas antes de escribir código. | **PASS** |
| **II. Security-First** | Todos los endpoints nuevos exigen `SupabaseAuthGuard` + `RolesGuard` + `@Roles(RolUsuario.admin)`. La redacción se aplica antes de persistir (`FR-017`). No hay secretos en el código; toda configuración nueva se documenta en `.env.example` con placeholders. | **PASS** |
| **III. Type-Safe & Validated** | TypeScript estricto en ambas capas. Los parámetros de consulta se validan con `class-validator` bajo el `ValidationPipe` con `whitelist: true` (`FR-014`). Prisma es la fuente de verdad y la migración se versiona y revisa. | **PASS** |
| **IV. Modular Single-Responsibility** | Módulo `tracing` con la estructura de `events` y `logs` (`application/`, `domain/`, `infrastructure/`, `interfaces/`). No se crean módulos comodín. El visor es una vista propia del panel de administración, y no altera la vista de logs que ya existe. | **PASS** |
| **V. End-to-End Integration** | Verificación de que la correlación fluye de la respuesta al log y a la traza, con Supertest (`FR-035`). Los permisos del visor quedan cubiertos por los casos de Supertest del propio endpoint, con el mismo guard que el resto de la API. | **PASS** |
| **Stack aprobado** | No se añade ningún framework. Los módulos de `specs/005-…` y de este plan comparten `DEPLOY_ENV`; el catálogo de entornos se documenta en vez de duplicar el validador, con una prueba que verifica la sincronía. | **PASS** |
| **Reglas de datos** | El borrado físico es la excepción que el Principio III exige justificar, y aquí está justificado: una traza retenida por soft-delete seguiría ocupando el espacio que la retención existe para liberar y bloquearía su clave de correlación. La justificación vive en `docs/TRAZABILIDAD.md` y sobrevive a este plan. | **PASS con justificación** |
| **Quality Gates** | `tasks.md` incluye ampliar la cobertura de Jest para que el módulo entre en la medición, y ejecutar `npm run api` y `npm run web` antes de abrir el PR. | **PASS** |

**Complejidad tracking**: hay una desviación que justificar, y está en
*Complexity Tracking* al final de este documento.

## Project Structure

### Documentation (this feature)

```text
specs/006-visor-trazabilidad-logs-tracers/
├── spec.md              # requisitos, historias de usuario y criterios verificables
├── plan.md              # este documento
├── data-model.md        # entidades Trazas y Spans, con sus reglas de validación
└── tasks.md             # desglose ejecutable, con las pruebas antes del código
```

Fuera de la carpeta de la spec, este feature toca dos documentos existentes y crea
tres:

```text
docs/
└── TRAZABILIDAD.md                       # NUEVO: contrato, retención, permisos, redacción
```

La comparativa `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` nació dentro de la
fase de selección de este plan y ya está en `develop`. No se tocan
`BACKEND_REVIEW.md` ni `INGENIERIA_INVERSA.md`: el cierre de sus puntos *Logs* y
*Tracing* quedó declarado en la fase de planeación, y la verificación de esta
issue se limita a lo que pide su alcance.

### Source Code (repository root)

```text
goblinhub-api/src/modules/tracing/
├── tracing.module.ts                       # instrumentación: escribe y publica el contexto
├── trazas.module.ts                        # superficie HTTP de lectura del visor
├── domain/
│   ├── constants/
│   │   ├── redaction-keys.ts              # política de claves sensibles
│   │   └── tracing-config.ts              # niveles, retención y nombre de servicio
│   ├── entities/
│   │   ├── traza.entity.ts
│   │   └── span.entity.ts
│   ├── enums/
│   │   ├── tipo-span.enum.ts
│   │   └── nivel-traza.enum.ts
│   ├── repositories/
│   │   └── traza.repository.ts            # interfaz + token TRAZA_REPOSITORY
│   └── services/
│       ├── redaction.service.ts           # redacción de secretos antes de escribir
│       └── tracing-context.service.ts     # AsyncLocalStorage del identificador
├── application/
│   ├── dtos/
│   │   └── get-traces-query.dto.ts        # class-validator + @ApiProperty
│   └── use-case/
│       ├── get-traces.use-case.ts
│       ├── get-trace.use-case.ts
│       └── purge-traces.use-case.ts
├── infrastructure/
│   ├── prisma/
│   │   └── prisma-traza.repository.ts
│   ├── middleware/
│   │   └── correlation-id.middleware.ts   # X-Request-Id, traceparent, AsyncLocalStorage
│   ├── interceptors/
│   │   └── tracing.interceptor.ts         # registra la traza y sus pasos
│   └── scheduler/
│       └── traces-retention.scheduler.ts  # purga programada
└── interfaces/
    └── controllers/
        └── trace.controller.ts            # admin-only, @ApiTags('Trazabilidad')
```

```text
goblinhub-api/prisma/
├── schema.prisma                          # EDITADO: modelos Trazas y Spans
└── migrations/
    ├── 20260927195414_add_trazas_and_spans/              # NUEVO: modelos, índices y FK en cascada
    └── 20260928041500_add_servicio_y_nivel_to_trazas/    # NUEVO: servicio y nivel con índice
```

```text
goblinhub_web/src/
├── services/
│   └── traces.service.ts                   # NUEVO: tipado de Trazas, Spans y filtros
├── hooks/
│   └── useTraces.ts                       # NUEVO: patrón de useLogs
├── pages/admin/logs/
│   ├── LogsAdmin.tsx                      # LEÍDO: patrón a seguir, sin cambios
│   └── LogsAdmin.css                      # LEÍDO: origen de los estilos a reutilizar
└── pages/admin/trazas/
    ├── TrazasAdmin.css                    # NUEVO: reutiliza las clases de LogsAdmin.css
    ├── TrazasAdmin.tsx                    # NUEVO: la vista de trazabilidad completa
    └── TrazasAdmin.test.tsx               # NUEVO: Vitest + Testing Library
```

**Structure Decision**: se sigue la estructura de directorios existente, sin
introducir variantes. El backend replica la de `src/modules/logs/`, que usa
`application/` en español correcto y no la variante mal escrita `aplication/` de
`products` y `rewards`. El token de inyección del repositorio de trazas es la
propia clase abstracta `TrazaRepository`, como ya hacen el resto de módulos del
proyecto.

La decisión no obvia es **dónde vive el visor**. El repositorio tiene
`goblinhub_web/src/pages/admin/logs/`, y dentro de ella un `LogsAdmin.css` con
filtros, paginación, botón de expandir fila, estilos de datos crudos y estado
vacío. El visor necesita de todo eso, así que **reutiliza esas clases**, pero no se
implementa como una pestaña dentro de `LogsAdmin.tsx`: esa vista funciona y esta
issue no pide reestructurarla. El visor es una vista propia en
`pages/admin/trazas/`, registrada en `/admin/trazas` como hermana de `/admin/logs`
bajo el mismo `ProtectedRoute` de rol `admin`, y alcanzable desde la navegación
del panel. `LogsAdmin.tsx` y `useLogs.ts` no se tocan.

El visor es una única vista, `pages/admin/trazas/TrazasAdmin.tsx`, y no se
descompone en subcomponentes: la superficie es la justa —listado, filtros,
pagina y detalle— y separarla habría sido componentes con una sola referencia
cada uno. Los pasos se presentan como una lista anidada, sin calcular su
posición respecto al inicio: los pasos se ejecutan en orden, la anidación ya
comunica la secuencia, y «en qué paso se fue el tiempo» lo responde su duración
sin una barra posicionada. Se mantienen las dependencias deliberadamente
mínimas del repositorio y no se añade una biblioteca de grafos ni de
cronogramas.

## Integración con el pipeline y con el monitoreo

El módulo no es un artefacto aislado: entra por los mismos canales que el resto
del proyecto (alcance de #207).

### Pipeline CI/CD

| Workflow | Qué ejecuta | Relación con este módulo |
|---|---|---|
| `api.yml` | Job `lint`: `npm run lint` + `npx tsc --noEmit`; job `build-and-test`: `npm run build` + `npm run test:cov` | Aquí corren los unitarios de `modules/tracing`. Las e2e de Supertest (`test/*.e2e-spec.ts`) no tienen workflow propio y se ejecutan en local (T036, T073). T074 añade `modules/tracing` al `collectCoverageFrom` para que el gate de cobertura (SLA S10, ≥ 80 %) lo mida |
| `web.yml` | `npm run lint`, `npm run build` y el job *E2E Tests (Playwright)* con `npm run test:e2e` | La vista `TrazasAdmin` queda bajo el lint y el build del panel; no abre una ruta nueva fuera del `ProtectedRoute` de rol `admin` |
| `snyk.yml` | Dependencias, código e IaC (SLA S11: 0 vulnerabilidades `critical`) | El módulo **no añade dependencias**, así que no introduce riesgo nuevo para ese gate |
| `monitoring.yml` | `promtool check config`, `promtool check rules` y `amtool check-config` sobre `monitoring/` | La trazabilidad no toca la configuración de Prometheus: este workflow solo cambia si se modifica el stack de la spec 005 |
| `playwright.yml`, `k6.yml`, `continuous-release.yml`, `release-cd.yml` | E2E, carga y liberación | Sin cambios: el módulo no altera rutas de negocio ni el proceso de despliegue |

Los gates locales equivalentes, ejecutados en T076 antes de cualquier PR, son
`npm run api` (lint + `tsc --noEmit` + build + cobertura) y `npm run web`. El
caso de estudio los recoge como **S9** (pipeline verde en `develop`), **S10**
(cobertura ≥ 80 %) y **S11** (sin vulnerabilidades `critical`) en
`docs/SLA_METRICAS_Y_PARAMETROS.md` §4.

### Monitoreo (convivencia con `specs/005-modulo-metricas-monitoreo`, #214)

- `/metrics`, `/healthz`, `/health` y `/traces` quedan **fuera** de la
  instrumentación de trazas: Prometheus sondea `/metrics` cada 15 s, y
  medirlo generaría unas 5 760 filas diarias de ruido y un camino de escritura
  que podría realimentarse (spec 006, § Edge Cases).
- **Orden de interceptores** en `app.module.ts`: `MetricsInterceptor` (#214)
  **antes** que `TracingInterceptor` (T025), de modo que las dos
  instrumentaciones convivan sin pisarse.
- **Catálogo de entornos compartido**: `DEPLOY_ENV` lo introduce la spec 005;
  este módulo lo lee y T058 mantiene una prueba que verifica que las dos listas
  siguen sincronizadas, para que un cambio rompa la prueba del otro módulo en
  lugar de producir una etiqueta inválida en silencio.
- **Reparto de responsabilidades**: el tablero de Prometheus
  (`monitoring/grafana/dashboards/goblinhub-overview.json`) responde **qué**
  está fallando (SLA S1 y S4); el visor responde **por qué** (endpoint,
  entorno, pasos internos y su duración). La remediación del SLA **S4** del
  caso de estudio menciona literalmente el «log de error con `correlationId`»,
  que es exactamente el dato que `FR-005` escribe en `datos_extra`.
- **Sin duplicar documentación**: el contrato y la operación ya están en
  `docs/TRAZABILIDAD.md` y `docs/RUNBOOK_MONITOREO.md`; esta sección solo
  declara dónde encaja el módulo respecto de esas piezas.

## Matriz de trazabilidad requisito-tarea-prueba

Patrón de `specs/005-modulo-metricas-monitoreo/plan.md` §9, extendida con la
columna de prueba que pide el criterio de aceptación de #207. Cubre los CA de
#207 y, por herencia, los de #204 que esta spec ya implementa, para que ningún
requisito quede sin tarea ni ninguna tarea sin prueba.

| Criterio de aceptación | Origen | Requisito | Sección | Tarea | Prueba |
|---|---|---|---|---|---|
| La spec define casos de uso, restricciones y criterios verificables | #207 | FR-001–FR-037 | `spec.md`: § User Scenarios (US1–US7), § Edge Cases, § Requirements, § Success Criteria (SC-001–SC-009) | T003, T080 | Revisión del PR de planeación |
| Las tasks enlazan con los requisitos y tienen orden de ejecución | #207 | — | `tasks.md`: cada tarea declara su `FR` y su fase 0–7, con *checkpoint* al cierre de cada fase | T006, T080–T086 | Revisión del PR de planeación |
| Se incluye una matriz de trazabilidad requisito-tarea-prueba | #207 | — | `plan.md`, esta sección | T081 | Revisión: cada fila cita un requisito, una tarea y una prueba existentes |
| Se contempla control de acceso y anonimización | #207 | FR-017–FR-021, FR-022, FR-025 | `spec.md` § Protección de datos sensibles; `data-model.md` § Seguridad de los datos; `plan.md` § Constitution Check (Principio II) | T013, T033, T040, T082 | `redaction.service.spec.ts`; `traces.e2e-spec.ts` (401 sin token, 403 con rol distinto de `admin`); T041 (ningún secreto en claro en `Spans.atributos`) |
| Se abre PR general de planeación SDD con revisión | #207 | — | — | T086 | PR hacia `develop` con `Closes #207` y solicitud de revisión al equipo |
| Se definen eventos, campos obligatorios, correlation ID, niveles, retención y consulta | #207 | FR-001–FR-016, FR-027–FR-029 | `data-model.md`: campos obligatorios en la columna «Nulo», eventos como Traza y Spans con `tipo` (`http`, `auth`, `prisma`, `cron`, `redis`), retención en § Retención y volumen; `spec.md` § Correlation ID | T005, T012, T061, T063 | `correlation-id.middleware.spec.ts`, `tracing-config.spec.ts`, `purge-traces.use-case.spec.ts`, `get-traces-query.dto.spec.ts` |
| Se justifica la solución de logs estructurados y tracers frente al caso de estudio | #207 | — | `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` §7 | T083 | Revisión del PR de planeación |
| Se documenta la integración con el pipeline y con el monitoreo | #207 | — | `plan.md`, § Integración con el pipeline y con el monitoreo (esta sección) | T084 | Gates de CI en verde: `api.yml`, `web.yml` y `monitoring.yml` |
| Cada solicitud tiene identificador correlacionable en logs y trazas | #204 | FR-001–FR-006 | `spec.md` US1; `plan.md` § Project Structure | T008–T016 | `correlation-id.middleware.spec.ts`, `tracing-propagation.e2e-spec.ts` |
| Se localizan errores por endpoint y despliegue | #204 | FR-011–FR-016 | `spec.md` US3; `data-model.md` § Reglas de validación de los filtros | T027–T036 | `get-traces-query.dto.spec.ts`, `traces.e2e-spec.ts` |
| No se registran secretos ni datos sensibles innecesarios | #204 | FR-017–FR-021 | `spec.md` US4 | T013, T037–T043 | `redaction.service.spec.ts`, `path-normalizer.service.spec.ts` |
| Se define la retención y los niveles de log | #204 | FR-027–FR-031 | `spec.md` US6; `data-model.md` § Retención y volumen | T058–T069 | `purge-traces.use-case.spec.ts`, `tracing-config.spec.ts` |
| Se documentan formato, retención, permisos y parámetros | #204 | FR-032–FR-034 | `spec.md` US7 | T070, T071 | Revisión de `docs/TRAZABILIDAD.md` |

## Complexity Tracking

> Se rellena **solo** porque el Constitution Check tiene una desviación que debe
> quedar justificada y versionada.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Se descarta la recomendación de OpenTelemetry de `docs/BACKEND_REVIEW.md` §7.4 (y la tarea T050 de la spec 005) y se implementa la trazabilidad en la aplicación | El visor es un criterio de aceptación de #204 y tiene que vivir **dentro del panel administrativo**, con el mismo JWT, el mismo guard de rol y la misma navegación. Un backend de trazas externo obliga a una segunda URL, un segundo login y una superficie de autenticación que no respeta el RBAC del producto. La matriz de `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` da 480 a la opción propia frente a 315 a OpenTelemetry, y la diferencia se concentra en ese criterio (C2) y en complejidad operativa (C4) | La alternativa "simple" aquí no es OpenTelemetry, sino **no construir el visor**: un `correlation_id` en el log sin consulta estructurada no permite localizar errores por endpoint ni por despliegue, que es el AC operativo de la issue. Entre las dos opciones de trazabilidad real, la propia es la que no introduce contenedores, dependencias ni un salto a otro sistema de datos |
| La traza se persiste en la base de datos de negocio, no en un almacén dedicado | Es lo que permite no operar infraestructura nueva y respetar el principio de presupuesto cero del proyecto. El riesgo se acota con el nivel mínimo de log que se persiste y con la purga por retención, los dos configurables por entorno | Un almacén dedicado obligaría a un contenedor más que respaldar y a un segundo origen de verdad, contra la comparación de la spec 005, que ya eligió la vía de menor infraestructura posible para las métricas |

**Riesgo residual aceptado**: el modelo `Trazas` es un span raíz y `Spans` son sus
hijos con `parent_id`, que es la misma forma del modelo de datos de OpenTelemetry.
Si el proyecto crece a más de un servicio, la migración consiste en añadir el SDK
y el exportador y en servir la misma consulta contra el backend de trazas,
conservando el contrato de `GET /traces` y `GET /traces/:correlationId` para que
el frontend no cambie. La columna `servicio` y el filtro homónimo ya están en el
contrato desde este primer despliegue, precisamente para que ese segundo servicio
no obligue a cambiarlo. Ese contrato es la pieza que hay que proteger: por eso los
dos endpoints llevan anotaciones completas de `@nestjs/swagger`, con `@ApiProperty`
en cada campo del DTO de filtros, para que `/api/docs` documente la consulta y los
tests de contrato tengan un punto de referencia estable.
