# Tasks: Visor de trazabilidad con logs y tracers

**Input**: Design documents from `/specs/006-visor-trazabilidad-logs-tracers/`

**Convención**: cada tarea declara el requisito (`FR-xxx`) de
`specs/006-visor-trazabilidad-logs-tracers/spec.md` que satisface y, cuando aplica,
la sección de `plan.md` o la entidad de `data-model.md` donde está diseñada.
Tareas `P` = paralelizables. En cada fase **las pruebas se escriben antes que la
implementación** (Principio I, Test-First), y por eso las tareas de prueba
llevan la etiqueta `[test]`.

> **Alcance de este fichero**: la **Phase 0** se completa en el primer PR de esta
> rama, tal como se hizo con #210 y la spec 005. Las **Phases 1 a 7** son la
> implementación, en bloques con un commit cada uno.

---

## Phase 0: Planeación SDD (este PR, issue #204)

- [x] T001 Comparar OpenTelemetry, Jaeger, Grafana Tempo, Datadog y la implementación propia con matriz ponderada de 6 criterios y veredicto por opción → `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`
- [x] T002 Justificar la selección por coste cero, integración con el panel de administración, complejidad operativa y privacidad, incluyendo las alternativas descartadas y la ruta de vuelta → `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`
- [x] T003 Redactar `specs/006-visor-trazabilidad-logs-tracers/spec.md` con las 7 user stories mapeadas a los criterios de aceptación de #204 y a T049/T050 de la spec 005
- [x] T004 Redactar `specs/006-visor-trazabilidad-logs-tracers/plan.md` con el Constitution Check, la estructura del módulo y el *Complexity Tracking* de la desviación de OpenTelemetry
- [x] T005 Redactar `specs/006-visor-trazabilidad-logs-tracers/data-model.md` con `Trazas`, `Spans`, sus índices, la normalización de rutas y las reglas de validación de los filtros
- [x] T006 Redactar estas tareas, cada una enlazada a su `FR` y a la sección del plan que la diseña
- [x] T007 [P] Actualizar la trazabilidad documental: `specs/README.md` con la fila 006 y nota de cierre en `docs/BACKEND_REVIEW.md` §7.4 y en `docs/INGENIERIA_INVERNA.md`

**Checkpoint**: la herramienta está seleccionada, justificada y desglosada en tareas implementables sin dependencias nuevas.

---

## Phase 1: Identificador de correlación (P1) — US1, FR-001–FR-006

Objetivo del MVP: una petición que llega con `X-Request-Id` lo conserva, lo devuelve
en la respuesta y ese mismo valor llega al log de actividad.

- [ ] T008 [test] Escribir `tracing/correlation-id.middleware.spec.ts`: con `X-Request-Id` válido lo conserva, sin la cabecera genera un UUID v4, con un valor no UUID genera uno, con `traceparent` válido toma el *trace-id*, con un `traceparent` mal formado lo ignora y no rompe, y siempre añade la cabecera a la respuesta (FR-001, FR-002, FR-003)
- [ ] T009 [test] Escribir `tracing/tracing-context.spec.ts`: el valor publicado se lee desde el contexto de la petición y desde un `setTimeout`, y dos peticiones concurrentes no comparten valor (FR-004)
- [ ] T010 [test] Escribir el caso de `activity-log.interceptor.spec.ts` que verifica que el log incluye el identificador recibido en la cabecera (FR-005)
- [ ] T011 [P] Crear `modules/tracing/domain/tracing-context.service.ts` sobre `AsyncLocalStorage` con `run`, `get` y un identificador de respaldo para el código que se ejecuta fuera de una petición, como los cron jobs (FR-004)
- [ ] T012 [P] Crear `modules/tracing/infrastructure/middleware/correlation-id.middleware.ts` con la validación de UUID v4, la lectura de `traceparent` con su `version-format-traceid`, el truncado a 64 caracteres y la cabecera de respuesta (FR-001, FR-002, FR-003)
- [ ] T013 [P] Crear `domain/constants/redaction-keys.ts` como **única fuente de verdad** de la política de claves, separando las que se enmascaran de las que se conservan a propósito, y `domain/services/redaction.service.ts` con su `.spec.ts`: enmascara por nombre de clave, trunca por longitud, respeta la constante, no toca las claves de auditoría y no muta el objeto recibido. La constante se define antes que la prueba, porque la prueba la necesita para existir (FR-017, FR-018, FR-019, FR-033)
- [ ] T014 Registrar el middleware en `app.module.ts` con `configure()` y el middleware global, respetando el orden de `main.ts` y sin tocar los entries de #214 (FR-004)
- [ ] T015 Añadir el identificador al `ActivityLogInterceptor` reutilizando su escritura actual, sin cambiar el contrato de `GET /logs` (FR-005)
- [ ] T016 Añadir `X-Request-Id` a `allowedHeaders` del CORS y excluir `/traces`, `/metrics` y `/health` del middleware de redirección, **preservando los entries que añada #214** (FR-034)
- [ ] T017 Ejecutar `npm run api` en `goblinhub-api` y confirmar que la suite existente sigue en verde (Principios I y V)

**Checkpoint**: `curl -i -H "X-Request-Id: <uuid>" localhost:3000/health` devuelve ese mismo valor en la cabecera de respuesta. *Cubre el AC de correlación de #204.*

---

## Phase 2: Persistencia de trazas y spans (P1) — US2, FR-007–FR-010

- [ ] T018 [test] Escribir `tracing/tracing.interceptor.spec.ts`: crea la traza al finalizar la petición, calcula la duración, guarda los spans hijos, no escribe si la ruta está excluida y no altera la respuesta si el repositorio falla (FR-007, FR-008, FR-010)
- [ ] T019 [P] Editar `prisma/schema.prisma` con los modelos `Trazas` y `Spans`, la relación con borrado en cascada y los cuatro índices de `data-model.md`, en la convención de nombres del esquema existente (FR-007, FR-008, `data-model.md` Entidades)
- [ ] T020 [P] Crear la migración con los mismos campos e índices, comprobar que `deleted_at` va en `Trazas`, no en `Spans`, y revisar el SQL que genera (FR-009, Principio III)
- [ ] T021 [P] Crear `domain/entities/traza.entity.ts` y `span.entity.ts` como tipos planos, sin herencia de las entidades de Prisma, siguiendo `events` y `logs` (FR-007, FR-008)
- [ ] T022 [P] Crear `domain/repositories/traza.repository.ts` con la interfaz y el token `TRAZA_REPOSITORY`, y `infrastructure/prisma/prisma-traza.repository.ts` con la implementación (FR-009)
- [ ] T023 Crear `domain/services/path-normalizer.service.ts` y su `.spec.ts`: normaliza UUID, numérico y entero de 32 dígitos, conserva los prefijos estáticos y no toca las rutas ya parametrizadas (FR-020)
- [ ] T024 [P] Crear `domain/enums/tipo-span.enum.ts` con `http`, `auth`, `prisma`, `cron` y `redis`, y el tipo del estado `ok`/`error` (FR-008)
- [ ] T025 Crear `infrastructure/interceptors/tracing.interceptor.ts` con el reloj monotónico, la exclusión de `/traces`, `/metrics` y `/health`, la escritura asíncrona sin `await` en el camino de respuesta y el `catch` que silencia el fallo de persistencia (FR-006, FR-010)
- [ ] T026 Crear `tracing.module.ts` y registrar el interceptor como `APP_INTERCEPTOR` en `app.module.ts` **después** de `MetricsInterceptor` de #214, para que las métricas sigan contando las trazas (FR-010, `plan.md` § Technical Context)
- [ ] T027 Añadir la escritura de un span en los puntos de negocio más costosos que ya existen: la autenticación y las consultas de eventos, con un helper de span padre-hijo (FR-008, AC de detalles internos de #204)
- [ ] T028 Ejecutar `npm run api` y comprobar la migración en la base de datos de desarrollo (Principios I y III)

**Checkpoint**: una petición instrumentada deja una fila en `Trazas` y sus spans en `Spans`, y el fallo de esa escritura no cambia el código de respuesta. *Cubre el AC de persistencia de #204.*

---

## Phase 3: Consulta de trazas (P1) — US3, FR-011–FR-016

- [ ] T029 [test] Escribir `get-traces-query.dto.spec.ts`: rechaza un parámetro desconocido, acota `limit` al rango 1–200, normaliza `metodo` a mayúsculas y valida el rango de fechas (FR-014, FR-015)
- [ ] T030 [test] Escribir `get-traces.use-case.spec.ts` con los filtros de ` desde la página uno, el `includeTotal` que omite el `COUNT` y la lista vacía cuando `desde` es posterior a `hasta` (FR-011, FR-015)
- [ ] T031 [test] Escribir `get-trace.use-case.spec.ts` y `get-traces-summary.use-case.spec.ts`: la traza con sus spans, y el agregado por ruta con recuento y percentiles de duración (FR-013, FR-016)
- [ ] T032 [P] Crear `application/dtos/get-traces-query.dto.ts` con `class-validator` y `@ApiProperty` en cada campo, siguiendo la tabla de rangos de `data-model.md` (FR-014)
- [ ] T033 [P] Crear `application/use-case/get-traces.use-case.ts` con los filtros en `where` de Prisma y el orden por `fecha_inicio` descendente, sin cargar la tabla completa (FR-011, FR-015)
- [ ] T034 [P] Crear `application/use-case/get-trace.use-case.ts` con la carga de los spans en una sola consulta por `id_traza`, con `404` y su mensaje si no existe (FR-013)
- [ ] T035 [P] Crear `application/use-case/get-traces-summary.use-case.ts` con `groupBy` sobre la ruta normalizada, recuento y percentiles calculados sobre el conjunto acotado por periodo (FR-016)
- [ ] T036 [P] Crear `interfaces/controllers/trace.controller.ts` con los tres endpoints, `@ApiTags('Trazabilidad')`, `@UseGuards(SupabaseAuthGuard, RolesGuard)`, `@Roles(RolUsuario.admin)` y las anotaciones de Swagger (FR-012, FR-013, FR-016, Principio II)
- [ ] T037 Ordenar las rutas del controlador para que `/traces/summary` se resuelva antes que `/traces/:correlationId`, y comprobarlo con una prueba de Supertest (FR-016)
- [ ] T038 [test] Escribir en `test/` los casos de Supertest: `401` sin token, `403` con rol `jugador`, `200` con `admin`, y `400` con un parámetro desconocido (Principios II y V)
- [ ] T039 Ejecutar `npm run api` y la suite e2e completa (Principio V)

**Checkpoint**: `GET /traces` con token de `admin` devuelve una página paginada y filtrable; sin rol adecuado devuelve `403`. *Cubre el AC de filtrado de #204.*

---

## Phase 4: Redacción de datos sensibles (P1) — US4, FR-017–FR-021

- [ ] T040 [test] **Ejecutada dentro de T013**, no como tarea independiente: la.spec.ts de `redaction.service.ts` no se escribe dos veces. Su alcance es la anidación en objetos y arreglos, y la comprobación de que la lista de claves que se guardan a propósito son las que declara `redaction-keys.ts`. No se lee de `docs/TRAZABILIDAD.md` (FR-017, FR-018, FR-019)
- [ ] T041 [test] Escribir el caso de integración que verifica que **ninguna** fila de `Spans.atributos` contiene un valor enmascarado, comprobando la tabla tras una operación real (FR-017, AC de no filtrar secretos de #204)
- [ ] T042 **[P] Fusionada en T013**: la constante `domain/constants/redaction-keys.ts` se crea junto al servicio, porque las pruebas la necesitan para existir. No es una tarea aparte
- [ ] T043 [P] Implementar el enmascarado recursivo por nombre de clave, con el marcador `[REDACTADO]`, y la truncación con el sufijo que indique que el valor se recortó (FR-018, FR-019)
- [ ] T044 Aplicar la redacción a los `atributos` de cada span en `tracing.interceptor.ts`, antes de la llamada a Prisma, y no en el momento de leer (FR-017)
- [ ] T045 [P] Verificar que el cuerpo de la petición, el de la respuesta, las cabeceras de autorización y las variables de entorno no se persisten en ninguna tabla, con una prueba que lo compruebe sobre la base de datos (FR-021)
- [ ] T046 [test] Escribir el caso de `path-normalizer.service.spec.ts` que verifica que ninguna ruta persistida contiene un UUID ni un identificador numérico (FR-020)

**Checkpoint**: un intento de guardar un token en los atributos de un span deja `[REDACTADO]` en la base de datos. *Cubre el AC de seguridad de #204.*

---

## Phase 5: Visor de trazabilidad (P2) — US5, FR-022–FR-026

- [ ] T047 [P] [test] Escribir `traces.service.ts` con su `.test.ts` tipado, siguiendo el patrón de `logs.service.ts`: `Trace`, `Span`, `TraceSummary`, `TraceFilters` y los tres métodos con su manejo de error (FR-022)
- [ ] T048 [P] [test] Escribir `TrazasAdmin.test.tsx` con `vi.mock` del servicio, `MemoryRouter` y los casos de lista paginada, estado vacío, error y apertura del detalle (FR-022, FR-024)
- [ ] T049 [P] [test] Escribir `TraceDetail.test.tsx` y `TraceTimeline.test.tsx` con la comprobación de que los pasos se dibujan con estilos calculados y sin ninguna dependencia de grafos (FR-023, FR-026)
- [ ] T050 [test] Escribir la prueba de permisos de Playwright: `admin` accede a la pestaña de trazas y un `jugador` no ve el enlace ni puede entrar por URL directa (FR-025, Principio V)
- [ ] T051 [P] Implementar `services/traces.service.ts` con `axios`, el interceptor de autenticación existente y el tipo del error que ya usa `logs.service.ts` (FR-022)
- [ ] T052 [P] Crear `hooks/useTraces.ts` con el patrón de `useLogs`, **corrigiendo los dos defectos que tiene**: el `catch` vacío que se traga el error y el tipo `Error` que no coincide con lo que devuelve `service.ts` (FR-024)
- [ ] T053 [P] Crear `pages/admin/logs/TrazasAdmin.tsx`: buscador, selector de método, de estado y de entorno, rango de fechas, duración mínima, tabla paginada y botón de refrescar (FR-022)
- [ ] T054 [P] Crear `pages/admin/logs/TraceFilters.tsx` con los mismos controles reutilizables, y un desplegable de duración mínima con valores precargados en lugar de texto libre (FR-022)
- [ ] T055 [P] Crear `pages/admin/logs/TracesTable.tsx` con las columnas de inicio, método, ruta, estado, duración y entorno, la fila expandible y la marca visual del error (FR-022)
- [ ] T056 [P] Crear `pages/admin/logs/TraceDetail.tsx` con la cabecera de la traza, el resumen de duración y el enlistado de pasos con sus atributos ya redactados (FR-023)
- [ ] T057 [P] Crear `pages/admin/logs/TraceTimeline.tsx` con el recorrido de pasos en CSS puro, calculando `left` y `width` en porcentaje a partir del inicio y la duración de cada paso, y con degradado de color por `tipo` y marca para `estado = error` (FR-023, FR-026)
- [ ] T058 [P] Editar `pages/admin/logs/LogsAdmin.tsx` para convertir la vista en un contenedor de pestañas, **manteniendo intacta** la pestaña de registros que ya existe y su funcionalidad (FR-022, `plan.md` § Structure Decision)
- [ ] T059 [P] Reutilizar `pages/admin/logs/LogsAdmin.css` sin duplicar estilos, añadiendo solo las clases del recorrido de pasos que no existan ya, e **importarlo en el componente que hoy no lo importa** (FR-026, `plan.md` § Structure Decision)
- [ ] T060 [P] Registrar la vista en la navegación del panel y añadir el alias `/admin/trazas` en el enrutador, conservando `/admin/logs` sin cambios (FR-025)
- [ ] T061 Ejecutar `npm run web` en `goblinhub_web` y comprobar que la suite existente sigue en verde (Principios I y V)

**Checkpoint**: la pestaña de trazas lista, filtra y abre una traza con su recorrido de pasos, y `npm run web` pasa. *Cubre el AC de visualización de #204.*

---

## Phase 6: Retención y configuración (P2) — US6, FR-027–FR-031

- [ ] T062 [test] Escribir `get-traces-config.spec.ts`: valores por defecto seguros, muestreo acotado a 0–1, retención no numérica que cae al valor por defecto **sin impedir el arranque**, y catálogo de `DEPLOY_ENV` sincronizado con el de la spec 005 (FR-029, FR-030)
- [ ] T063 [test] Escribir `purge-traces.use-case.spec.ts`: elimina solo lo anterior al periodo, devuelve el recuento de las trazas y de los spans en cascada, y es inocuo con `TRAZAS_ENABLED = false` (FR-027)
- [ ] T064 [P] Crear `domain/constants/tracing-config.ts` con los valores por defecto y una función de lectura tolerante a errores, con aviso en el log y sin lanzar excepción (FR-029)
- [ ] T065 [P] Crear `application/use-case/purge-traces.use-case.ts` con el borrado por fecha de inicio y el recuento devuelto (FR-027)
- [ ] T066 [P] Crear `infrastructure/scheduler/traces-retention.scheduler.ts` con `@Cron` y el registro de su resultado, siguiendo el patrón de `backup.scheduler.ts` y `event-expiration.scheduler.ts` (FR-028)
- [ ] T067 [P] Integrar el muestreo, el umbral de latencia y el interruptor en `tracing.interceptor.ts`, garantizando que los errores y las peticiones lentas se guarden siempre, con independencia del muestreo (FR-029, FR-031)
- [ ] T068 [P] Añadir las cinco variables nuevas a `goblinhub-api/.env.example` con valores por defecto y sin secretos, **conservando las que introduce #214** (FR-029, `FR-030, Principio II)
- [ ] T069 [test] Escribir el caso de `tracing.interceptor.spec.ts` que demuestra que con `TRAZAS_ENABLED = false` no se escribe ninguna traza y la respuesta del servicio es idéntica (FR-031)
- [ ] T070 Ejecutar `npm run api` y comprobar que la purga programada no altera el comportamiento del resto del servicio (Principios I y V)

**Checkpoint**: la configuración por entorno controla qué se guarda y cuánto tiempo, y se puede desactivar sin detener el servicio. *Cubre el AC de retención de #204.*

---

## Phase 7: Documentación, verificación y gates (P2) — US7, FR-032–FR-037

- [ ] T071 [P] Redactar `docs/TRAZABILIDAD.md` con el contrato de cabeceras, el formato de la traza y del paso, el esquema de las dos tablas, todos los parámetros de los endpoints, los permisos exigidos y la política de retención. La sección de datos sensibles **se deriva de `redaction-keys.ts`**, no al revés: el documento describe la constante, nunca la fuente (FR-032)
- [ ] T072 [P] Enumerar en el mismo documento las claves que se enmascaran y las que se guardan a propósito, **transcribiéndolas de `redaction-keys.ts`** y con el motivo de cada excepción. Si el documento y la constante discrepan, la constante gana (FR-033)
- [ ] T073 [P] Añadir las dos tablas al diagrama ER de `docs/INGENIERIA_INVERNA.md` y cerrar los puntos *Logs* y *Tracing* de `docs/BACKEND_REVIEW.md` §7.4 remitiendo a este módulo (T049, T050)
- [ ] T074 [test] Escribir `test/tracing-propagation.e2e-spec.ts`: una petición con un identificador conocido lo recibe en la respuesta, ese mismo valor aparece en la traza de `GET /traces/:correlationId` y en el log de actividad de la mutación (FR-035, Principio V)
- [ ] T075 [P] Ampliar la lista `collectCoverageFrom` para que incluya `tracing`, `logs` y `health`, de modo que el módulo de trazabilidad entre en la medición de cobertura (FR-037)
- [ ] T076 [P] Añadir el paso `test:e2e` al pipeline de `api.yml`, conservando el orden de los gates y sin eliminar ninguno (FR-035, Principio Quality Gates)
- [ ] T077 Levantar la aplicación en local, recorrer el visor con un token de `admin` y adjuntar al PR la captura del recorrido de pasos junto con la salida de la prueba de propagación (FR-036)
- [ ] T078 Ejecutar `npm run api` y `npm run web` completos, con lint, `tsc --noEmit`, build y cobertura en verde (Principios I y V)
- [ ] T079 [P] Actualizar la trazabilidad documental: fila 006 de `specs/README.md` y estado de T049 y T050 en la spec 005 (T049, T050)
- [ ] T080 Escribir el PR con la plantilla del repositorio, `Closes #204`, etiquetas `Feature` y `enhancement`, y solicitar revisión del equipo (AGENTS.md)

**Checkpoint**: la evidencia está adjunta, los cuatro gates de CI están en verde y el PR queda listo para revisión.

---

## Dependencias y orden crítico

- **Phase 1 → Phase 2 → Phase 3** es una cadena: sin identificador no hay traza que
  correlacionar, y sin traza persistida no hay nada que consultar.
- **Phase 4** se puede desarrollar en paralelo con la 3 en cuanto exista el servicio
  de redacción de la 1, y debe integrarse antes de que haya tráfico real en la
  base de datos.
- **Phase 5** depende de la 3, porque el visor consume los tres endpoints.
- **Phase 6** depende de la 2, porque la purga borra lo que la 2 persiste.
- **Phase 7** cierra el PR y no puede empezar hasta que las anteriores estén en verde.

## Antes de la Phase 1

- [ ] Comprobar el estado de merge de #214 con `git fetch origin` y revisar el diff de
  su rama sobre `develop`.
- [ ] Si #214 se ha fusionado, actualizar la rama con `git rebase origin/develop` y
  resolver los conflictos de `app.module.ts` y `main.ts` **conservando los dos
  cambios**: los entries de métricas y salud, y la línea de trazas.
- [ ] Si #214 no se ha fusionado, subir la rama y resolver los conflictos cuando se
  integre, sin tocar el código propio de esa issue.
- [ ] Verificar con `git diff` que ninguna modificación afecta a los archivos
  internos de #214.

### Coordinación con #214

Cuatro tareas no se pueden cerrar hasta que #214 aterrice, porque leen cosas que
esa issue crea: el orden de los interceptores en `app.module.ts` (T026), el
catálogo de entornos que valida `DEPLOY_ENV` (T062), la colocación de las variables
en `.env.example` (T068) y la lista de cobertura de Jest (T075). Se implementan
igual, pero su cierre queda pendiente del merge. El detalle de qué línea toca cada
una está en las «Dependencies» de `spec.md`.

## Desviaciones del alcance aceptadas

Los tres fragmentos del alcance de #204 que este spec no entrega —registros
estructurados en JSON, niveles de log y filtro por servicio— están declarados con
su motivo en «Desviaciones del alcance de #204» de `spec.md`. Ninguno bloquea una
tarea: son deuda que se hereda en las tareas T049 y T050 de la spec 005.
