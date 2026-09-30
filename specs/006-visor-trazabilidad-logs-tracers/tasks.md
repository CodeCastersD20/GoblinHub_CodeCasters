# Tasks: Visor de trazabilidad con logs y tracers

**Input**: Design documents from `/specs/006-visor-trazabilidad-logs-tracers/`

**Convención**: cada tarea declara el requisito (`FR-xxx`) de
`specs/006-visor-trazabilidad-logs-tracers/spec.md` que satisface y, cuando aplica,
la sección de `plan.md` o la entidad de `data-model.md` donde está diseñada.
Tareas `P` = paralelizables. En cada fase **las pruebas se escriben antes que la
implementación** (Principio I, Test-First).

> **Alcance de este fichero**: la **Phase 0** y las **Phases 1 y 2** están
> cerradas. Las **Phases 3 a 7** están implementadas y verificadas; lo único que
> queda abierto es la **evidencia del visor** (T075), que depende del entorno y la
> captura. Cada fase se cerró con un bloque de commits. La sección
> **Planeación SDD (issue #207)** se cierra con el PR de planeación (T086).

---

## Phase 0: Planeación SDD (cerrada, issue #204)

- [x] T001 Comparar OpenTelemetry, Jaeger, Grafana Tempo, Datadog y la implementación propia con matriz ponderada de 6 criterios y veredicto por opción → `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`
- [x] T002 Justificar la selección por coste cero, integración con el panel de administración, complejidad operativa y privacidad, incluyendo las alternativas descartadas y la ruta de vuelta → `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`
- [x] T003 Redactar `specs/006-visor-trazabilidad-logs-tracers/spec.md` con las 7 user stories mapeadas a los criterios de aceptación de #204 y a T049/T050 de la spec 005
- [x] T004 Redactar `specs/006-visor-trazabilidad-logs-tracers/plan.md` con el Constitution Check, la estructura del módulo y el *Complexity Tracking* de la desviación de OpenTelemetry
- [x] T005 Redactar `specs/006-visor-trazabilidad-logs-tracers/data-model.md` con `Trazas`, `Spans`, sus índices, la normalización de rutas y las reglas de validación de los filtros
- [x] T006 Redactar estas tareas, cada una enlazada a su `FR` y a la sección del plan que la diseña

**Checkpoint**: la herramienta está seleccionada, justificada y desglosada en tareas implementables sin dependencias nuevas.

---

## Phase 1: Identificador de correlación (cerrada) — US1, FR-001–FR-006

- [x] T008 [test] `tracing/correlation-id.middleware.spec.ts`: `X-Request-Id` válido se conserva, sin cabecera genera un UUID v4, valor no UUID genera uno, `traceparent` válido toma el *trace-id*, `traceparent` mal formado se ignora, y siempre se añade la cabecera a la respuesta (FR-001, FR-002, FR-003)
- [x] T009 [test] `tracing-context.service.spec.ts`: el valor publicado se lee desde el contexto de la petición y desde un `setTimeout`, y dos peticiones concurrentes no comparten valor (FR-004)
- [x] T010 [test] Caso de `activity-log.interceptor.spec.ts` que verifica que el log incluye el identificador recibido en la cabecera (FR-005)
- [x] T011 [P] `modules/tracing/domain/services/tracing-context.service.ts` sobre `AsyncLocalStorage` (FR-004)
- [x] T012 [P] `modules/tracing/infrastructure/middleware/correlation-id.middleware.ts` con validación de UUID v4, lectura de `traceparent`, truncado a 64 caracteres y cabecera de respuesta (FR-001, FR-002, FR-003)
- [x] T013 [P] `domain/constants/redaction-keys.ts` como única fuente de verdad de la política de claves, y `domain/services/redaction.service.ts` con su `.spec.ts` (FR-017, FR-018, FR-019, FR-033)
- [x] T014 Registrar el middleware en `app.module.ts` con `configure()` y el middleware global (FR-004)
- [x] T015 Añadir el identificador al `ActivityLogInterceptor` reutilizando su escritura actual, sin cambiar el contrato de `GET /logs` (FR-005)
- [x] T016 Añadir `X-Request-Id` a `allowedHeaders` del CORS y excluir `/traces`, `/metrics` y `/health` del middleware de redirección, **preservando los entries de #214** (FR-034)

**Checkpoint**: una petición con `X-Request-Id` fijo devuelve ese mismo valor en la cabecera de respuesta, y el log de actividad de esa petición lo guarda en `datos_extra.correlationId`. *Cubre el AC de correlación de #204.*

---

## Phase 2: Persistencia de trazas y spans (cerrada) — US2, FR-007–FR-010

- [x] T017 [test] `tracing/tracing.interceptor.spec.ts`: crea la traza al finalizar la petición, calcula la duración, guarda los spans hijos, no escribe si la ruta está excluida y no altera la respuesta si el repositorio falla (FR-007, FR-008, FR-010)
- [x] T018 [P] `prisma/schema.prisma` con los modelos `Trazas` y `Spans`, la relación con borrado en cascada y los índices de `data-model.md` (FR-007, FR-008)
- [x] T019 [P] Migración `20260927195414_add_trazas_and_spans` con los mismos campos e índices, revisando el SQL generado (FR-009, Principio III)
- [x] T020 [P] `domain/entities/traza.entity.ts` y `span.entity.ts` como tipos planos, sin herencia de las entidades de Prisma (FR-007, FR-008)
- [x] T021 [P] `domain/repositories/traza.repository.ts` con la clase abstracta y el token `TRAZA_REPOSITORY`, e `infrastructure/prisma/prisma-traza.repository.ts` con la implementación (FR-009)
- [x] T022 `domain/services/path-normalizer.service.ts` y su `.spec.ts`: normaliza UUID, numérico y entero de 32 dígitos, conserva los prefijos estáticos y no toca las rutas ya parametrizadas (FR-020)
- [x] T023 [P] `domain/enums/tipo-span.enum.ts` con `http`, `auth`, `prisma`, `cron` y `redis`, y el tipo del estado `ok`/`error` (FR-008)
- [x] T024 `infrastructure/interceptors/tracing.interceptor.ts` con el reloj monotónico, la exclusión de `/traces`, `/metrics` y `/health`, la escritura asíncrona sin `await` en el camino de respuesta y el `catch` que silencia el fallo (FR-010)
- [x] T025 `tracing.module.ts` y registro del interceptor como `APP_INTERCEPTOR` en `app.module.ts` **después** de `MetricsInterceptor` de #214 (FR-010)
- [x] T026 Añadir la escritura de un span en la autenticación y en las consultas de eventos, con el helper de span padre-hijo (FR-008)

**Checkpoint**: una petición instrumentada deja una fila en `Trazas` y sus spans en `Spans`, y el fallo de esa escritura no cambia el código de respuesta. *Cubre el AC de persistencia de #204.*

---

## Phase 3: Consulta de trazas (cerrada) — US3, FR-011–FR-016

- [x] T027 [test] `get-traces-query.dto.spec.ts`: rechaza un parámetro desconocido, acota `limit` al rango 1–200, normaliza `metodo` a mayúsculas y valida el rango de fechas (FR-014, FR-015)
- [x] T028 [P] `application/dtos/get-traces-query.dto.ts` con `class-validator` y `@ApiPropertyOptional` en cada campo, con el conjunto exacto de filtros del alcance: `servicio`, `metodo`, `ruta`, `estado`, `ambiente`, `desde`, `hasta` (FR-014)
- [x] T029 [test] `get-traces.use-case.spec.ts` con el filtro de `servicio` y el `includeTotal` que omite el `COUNT` (FR-011, FR-015)
- [x] T030 `traza.repository.ts` con el tipo `FiltrosTrazas` y los métodos `listar` y `obtenerPorCorrelationId`, implementados en `prisma-traza.repository.ts` (FR-011, FR-013)
- [x] T031 [P] `application/use-case/get-traces.use-case.ts` con los filtros en el `where` de Prisma y el orden por `fecha_inicio` descendente (FR-011, FR-015, FR-016)
- [x] T032 [P] `application/use-case/get-trace.use-case.ts` con la carga de los spans en una sola consulta, y `404` con su mensaje si no existe (FR-013)
- [x] T033 [P] `interfaces/controllers/trace.controller.ts` con `GET /traces` y `GET /traces/:correlationId`, `@ApiTags('Trazabilidad')`, `@UseGuards(SupabaseAuthGuard, RolesGuard)`, `@Roles(RolUsuario.admin)` y anotaciones de Swagger (FR-012, FR-013, Principio II)
- [x] T034 Registrar `TraceController` y los dos casos de uso en `tracing.module.ts` (FR-012, FR-013)
- [x] T035 [test] Casos de Supertest en `test/traces.e2e-spec.ts`: `401` sin token, `403` con rol `jugador`, `200` con `admin`, `404` con una correlación inexistente y `400` con un parámetro desconocido (Principios II y V)
- [x] T036 Ejecutar `npm run api` y la suite e2e completa (Principio V)

**Checkpoint**: `GET /traces` con token de `admin` devuelve una página paginada y filtrable; sin rol adecuado devuelve `403`. *Cubre el AC de filtrado de #204.*

---

## Phase 4: Redacción de datos sensibles (cerrada) — US4, FR-017–FR-021

- [x] T037 [test] Ejecutada dentro de T013, no como tarea independiente: la `.spec.ts` de `redaction.service.ts` no se escribe dos veces (FR-017, FR-018, FR-019)
- [x] T038 [P] `domain/constants/redaction-keys.ts` fusionado en T013: la constante se crea junto al servicio porque las pruebas la necesitan para existir (FR-018, FR-033)
- [x] T039 [P] Enmascarado recursivo por nombre de clave con el marcador `[REDACTADO]`, y truncado con el sufijo que indique que el valor se recortó (FR-018, FR-019)
- [x] T040 Inyectar `RedactionService` en `tracing.interceptor.ts` y aplicar la redacción a los `atributos` de cada span y al mensaje de error **antes** de la llamada a Prisma, nunca en el momento de leer (FR-017)
- [x] T041 [test] Caso que verifica que **ninguna** fila de `Spans.atributos` contiene un valor en claro después de una operación que intenta guardar un `password`, una cabecera `Authorization` y un `access_token` (FR-017, AC de no filtrar secretos de #204)
- [x] T043 [test] `path-normalizer.service.spec.ts` verifica que ninguna ruta persistida contiene un UUID ni un identificador numérico (FR-020)

**Checkpoint**: un intento de guardar un token en los atributos de un span deja `[REDACTADO]` en la base de datos. *Cubre el AC de seguridad de #204.*

---

## Phase 5: Visor de trazabilidad (cerrada) — US5, FR-022–FR-026

- [x] T044 [test] `traces.service.ts` con su `.test.ts` tipado, siguiendo el patrón de `logs.service.ts`: `Trace`, `Span`, `TraceDetail` y los dos métodos (FR-022)
- [x] T045 [test] `TrazasAdmin.test.tsx` con `vi.mock` del servicio, `MemoryRouter` y los casos de lista paginada, estado vacío, error, filtros y apertura del detalle (FR-022, FR-024)
- [x] T048 [P] `services/traces.service.ts` con `axios`, el interceptor de autenticación existente y el tipo del error que ya usa `logs.service.ts`, que se lee como patrón y **no se modifica** (FR-022)
- [x] T049 [P] `hooks/useTraces.ts` con el patrón de `useLogs`, también **sin modificar** (FR-022)
- [x] T050 [P] `pages/admin/trazas/TrazasAdmin.css` con las clases del listado de pasos que no existan ya en `LogsAdmin.css`, del que se reutiliza el resto por `@import` (FR-026, `plan.md` § Structure Decision)
- [x] T051 [P] `pages/admin/trazas/TrazasAdmin.tsx`: buscador, selector de servicio, método, estado y entorno, rango de fechas, tabla paginada, fila expandible y descripción del identificador de correlación (FR-022, FR-024)
- [x] T056 [P] Registrar `/admin/trazas` en `App.tsx` con `lazy`, como hermana de `/admin/logs` bajo el mismo `ProtectedRoute` de rol `admin`, y añadir el enlace en la navegación del panel. **`LogsAdmin.tsx` y `useLogs.ts` no se tocan** (FR-025, `plan.md` § Structure Decision)
- [x] T057 Ejecutar `npm run web` en `goblinhub_web` y comprobar que la suite existente sigue en verde (Principios I y V)

**Nota de T046 y T055**: no existe `TraceTimeline` ni `TraceDetail` como
componentes separados. El detalle se resuelve en `TrazasAdmin.tsx`, y los pasos
se presentan como una lista anidada (con su duración y su estado), no como una
barra posicionada por inicio. La justificación está en la historia 5 de `spec.md`
y en `plan.md` § Structure Decision.

**Checkpoint**: la vista de trazas lista, filtra y abre una traza con sus pasos, y `npm run web` pasa. *Cubre el AC de visualización de #204.*

---

## Phase 6: Niveles, servicio y retención (cerrada) — US6, FR-016, FR-027–FR-031

- [x] T058 [test] `tracing-config.spec.ts`: valores por defecto seguros, nivel fuera de catálogo que cae al valor por defecto **sin impedir el arranque**, retención no numérica que cae al valor por defecto, y catálogo de `DEPLOY_ENV` sincronizado con el de la spec 005 (FR-029, FR-030)
- [x] T059 [test] `purge-traces.use-case.spec.ts`: elimina solo lo anterior al periodo y devuelve el recuento en cascada (FR-027)
- [x] T060 [test] `tracing.interceptor.spec.ts` demuestra que con el nivel mínimo en `error` no se persisten las trazas de nivel `info` (FR-031)
- [x] T061 [P] `domain/enums/nivel-traza.enum.ts` con `info`, `warn` y `error`, y la derivación del nivel a partir del código de respuesta (FR-016)
- [x] T062 [P] Migración `20260928041500_add_servicio_y_nivel_to_trazas` con `@@index([servicio, fecha_inicio])`, revisando el SQL generado (FR-016, Principio III)
- [x] T063 [P] `domain/constants/tracing-config.ts` con los valores por defecto y una función de lectura tolerante a errores, con aviso en el log y sin lanzar excepción (FR-029)
- [x] T064 [P] `Traza`, `GetTracesQueryDto` y el visor usan el servicio y el nivel (FR-012, FR-016)
- [x] T065 [P] `application/use-case/purge-traces.use-case.ts` con el borrado físico por fecha de inicio y el recuento devuelto (FR-027)
- [x] T066 [P] `infrastructure/scheduler/traces-retention.scheduler.ts` con `@Cron('17 3 * * *')` y el registro de su resultado (FR-028)
- [x] T067 [P] Integrar el nivel mínimo y el nombre de servicio en `tracing.interceptor.ts`: con el mínimo en `error` se guardan solo los fallos (FR-029, FR-031)
- [x] T068 [P] Añadir `TRAZAS_NIVEL_MINIMO`, `TRAZAS_RETENCION_DIAS` y `TRAZAS_SERVICIO` a `goblinhub-api/.env.example` con valores por defecto y sin secretos, **conservando `DEPLOY_ENV` de #214** (FR-029, FR-030, Principio II)
- [x] T069 Ejecutar `npm run api` y comprobar que la purga programada no altera el comportamiento del resto del servicio (Principios I y V)

**Nota de T059 y T067**: no existe `TRAZAS_ENABLED`. Para apagar la trazabilidad
se fija `TRAZAS_NIVEL_MINIMO=error`, que es el mecanismo que define `FR-031`.

**Checkpoint**: la configuración por entorno controla qué se guarda y cuánto tiempo, y se puede cerrar del todo sin detener el servicio. *Cubre el AC de retención y de niveles de #204.*

---

## Phase 7: Documentación, verificación y gates — US7, FR-032–FR-037

- [x] T070 Redactar `docs/TRAZABILIDAD.md` con el contrato de cabeceras, el formato de la traza y del paso, todos los parámetros de los endpoints, los permisos exigidos y la política de retención. La sección de datos sensibles **se deriva de `redaction-keys.ts`**, no al revés (FR-032)
- [x] T071 Enumerar en el mismo documento las claves que se enmascaran y las que se guardan a propósito, **transcribiéndolas de `redaction-keys.ts`** y con el motivo de cada excepción. Si el documento y la constante discrepan, la constante gana (FR-033)
- [x] T073 [test] `test/tracing-propagation.e2e-spec.ts`: una petición con un identificador conocido lo recibe en la respuesta, ese mismo valor aparece en la traza y en el log de actividad de la mutación, incluido el camino de error, la adopción de `traceparent` y el rechazo de un valor manipulado (FR-035, Principio V)
- [x] T074 Ampliar la lista `collectCoverageFrom` para que incluya `modules/tracing`, de modo que el módulo de trazabilidad entre en la medición de cobertura (FR-037)
- [ ] T075 **BLOQUEADA**: levantar la aplicación en local, recorrer el visor con un token de `admin` y adjuntar al PR la captura del recorrido de pasos junto con la salida de la prueba de propagación (FR-036). Requiere: base de datos/Supabase accesible, credenciales de `admin` y `gh` para el PR; ninguna de las tres está disponible en este entorno (FR-036)
- [x] T076 Ejecutar `npm run api` y `npm run web` completos, con lint, `tsc --noEmit`, build y cobertura en verde (Principios I y V)
- [ ] T078 Escribir el PR con la plantilla del repositorio, `Closes #204`, etiquetas `Feature` y `enhancement`, y solicitar revisión del equipo (AGENTS.md). **BLOQUEADA** por la ausencia de `gh`

**Checkpoint**: los gates de CI están en verde y el PR queda listo para revisión. La única pieza pendiente es la evidencia visual (T075) y el propio PR (T078), ambas bloqueadas por el entorno.

---

## Planeación SDD del módulo (issue #207)

Tareas de la issue #207 en orden de ejecución; cada una declara su criterio de
aceptación. Se ejecutan sobre la spec ya mergeada de #204, sin tocar código.

- [x] T080 Actualizar las cabeceras de `spec.md` y `plan.md` para enlazar la rama de planeación `doc/207-docs-planeación-sdd-del-visor-de-trazabilidad` con la de implementación `feat/204-feature-implementar-visor-de-trazabilidad-con-logs-y-tracers` (CA «La spec define casos de uso…»)
- [x] T081 Añadir en `plan.md` la matriz de trazabilidad requisito-tarea-prueba, con la columna de prueba, siguiendo el patrón del §9 de la spec 005 (CA «Se incluye una matriz…»)
- [x] T082 Aclarar en `spec.md` § Protección de datos sensibles que la anonimización se resuelve con la redacción en punto de escritura (`FR-017`–`FR-021`) y que `id_usuario` es la única identificación persistida, sin duplicar el contenido de `data-model.md` (CA «Se contempla control de acceso y anonimización»)
- [x] T083 Documentar en `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` §7 la justificación de logs estructurados y tracers frente al caso de estudio de `docs/SLA_METRICAS_Y_PARAMETROS.md` (alcance: justificar la solución)
- [x] T084 Documentar en `plan.md` la integración del módulo con el pipeline CI/CD y con el stack de monitoreo de la spec 005 (alcance: integración con pipeline y monitoreo)
- [x] T085 Añadir la entrada de #207 al «Flujo por módulo ejecutado» de `specs/README.md` (CA «Las tasks enlazan con los requisitos…»)
- [ ] T086 Preparar y abrir el PR general de planeación hacia `develop` con la plantilla del repositorio, `Closes #207`, etiquetas `documentation` y `docs`, y solicitud de revisión del equipo (CA «Se abre PR general de planeación SDD con revisión»). El cuerpo del PR queda preparado en el entorno de trabajo; la apertura y el *request review* los realiza el equipo, porque este entorno no dispone de `gh` (mismo motivo que T078)

**Checkpoint**: los cinco criterios de aceptación de #207 quedan cubiertos por
la matriz de `plan.md` (fila a fila) y el PR de planeación está listo para
revisión.

---

## Coordinación con #214

El orden de los interceptores en `app.module.ts` (T025), el catálogo de entornos
que valida `DEPLOY_ENV` (T058), la colocación de las variables en `.env.example`
(T068) y la lista de cobertura de Jest (T074) necesitaban lo que #214 crea; se
implementaron igual y su cierre quedó pendiente del merge de #214. El detalle de
qué línea toca cada una está en las «Dependencies» de `spec.md`.

## Fuera de alcance de #204

- **Formato JSON de los mensajes de `Logger` de Nest** (`nestjs-pino` + Loki): es
  un cambio de formato en toda la superficie de logs, muy por encima del eje de
  esta issue, y ya está registrado como tarea T049 de la spec 005. El punto *Logs*
  de `docs/BACKEND_REVIEW.md` §7.4 sigue abierto por este motivo.
- **OpenTelemetry como estándar de trazas distribuidas**: la ruta de vuelta está
  en `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` §6.3.
- **Corregir las rutas muertas de la navegación existente** (`/usuariosAdmin` y
  `/eventosAdmin` en `Administracion.tsx`): es un bug preexistente ajeno a esta
  issue, y merece la suya.
- **Interruptor de trazabilidad `TRAZAS_ENABLED`** y **filtrado por
  `correlationId`, `usuarioId` y `minDuracion`**: no están en el alcance de la
  issue, y el cierre se hace con `TRAZAS_NIVEL_MINIMO=error`. Ver `FR-012` y
  `FR-031`.
- **Representación de los pasos en cascada**: la lista anidada basta para el
  diagnóstico; ver la historia 5 de `spec.md`.