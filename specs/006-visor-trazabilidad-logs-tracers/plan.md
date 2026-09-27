# Implementation Plan: Visor de trazabilidad con logs y tracers

**Branch**: `feat/204-feature-implementar-visor-de-trazabilidad-con-logs-y-tracers` | **Date**: 2026-09-27 | **Spec**: `specs/006-visor-trazabilidad-logs-tracers/spec.md`

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
administración, con un recorrido de pasos dibujado con los estilos que ya están en
el repositorio.

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
`/admin/usuarios`); dos modelos de datos nuevos; dos endpoints; cinco historias P1
y tres P2.

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
| **Reglas de datos** | Sin borrado físico como norma: `Trazas` tiene `deleted_at`. La purga es la excepción documentada que exige el Principio III, con su justificación en `docs/TRAZABILIDAD.md`. | **PASS con justificación** |
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
├── TRAZABILIDAD.md                       # NUEVO: contrato, retención, permisos, redacción
├── COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md  # NUEVO: decisión de stack
├── BACKEND_REVIEW.md                     # EDITADO: cierra los puntos Logs y Tracing de §7.4
└── INGENIERIA_INVERNA.md                 # EDITADO: añade las dos tablas al diagrama ER
```

### Source Code (repository root)

```text
goblinhub-api/src/modules/tracing/
├── tracing.module.ts
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
└── migrations/2026XXXXXXXXXX_add_trazas_y_spans/   # NUEVO: migración revisada
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
    ├── TrazasAdmin.tsx                    # NUEVO: la vista de trazabilidad
    ├── TraceFilters.tsx                   # NUEVO
    ├── TracesTable.tsx                    # NUEVO
    ├── TraceDetail.tsx                    # NUEVO
    └── TraceTimeline.tsx                  # NUEVO: recorrido de pasos con CSS puro
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

El waterfall de los pasos se dibuja con CSS puro, con `left` y `width` en
porcentaje, sin librería de grafos ni de cronogramas: el repositorio mantiene sus
dependencias deliberadamente mínimas y `chart.js` no aporta nada para una barra
posicionada en el tiempo.

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
