# Feature Specification: Visor de trazabilidad con logs y tracers

**Feature Branch**: `doc/207-docs-planeación-sdd-del-visor-de-trazabilidad` (planeación) → `feat/204-feature-implementar-visor-de-trazabilidad-con-logs-y-tracers` (implementación)

**Created**: 2026-09-27

**Status**: Draft — implementación de #204 en curso

**Input**: User description: "/speckit.specify Visor de trazabilidad: centralizar y
consultar registros estructurados, propagar correlation ID/trace ID entre
servicios, integrar trazas o rastros (tracers) con filtros por servicio,
operación, estado y periodo, y definir retención, niveles de log y protección de
datos sensibles."

**Decisión de stack**: implementación propia sobre Prisma (identificador de
correlación propagado en la aplicación, con trazas y pasos internos persistidos),
justificada en `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`. Recoge la deuda
T050 de `specs/005-modulo-metricas-monitoreo/tasks.md`, que quedó fuera del
alcance de #214.

**Alcance**: este spec cubre los cinco criterios de aceptación de #204. Un único
fragmento del *alcance* queda fuera a propósito —el formato JSON de los mensajes
que la API escribe con `Logger` de Nest— y está declarado, con su motivo, en
«Desviaciones del alcance de #204». Los tres que una versión anterior de este
documento descartaba, «definir niveles de log» y «filtrar por servicio», **se
entregan**: los dos están nombrados en el alcance de la issue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cada solicitud lleva un identificador correlacionable (Priority: P1)

Como desarrollador que investiga una incidencia, puedo tomar el identificador que
devuelve la respuesta de una solicitud y usarlo para encontrar **todas** las
líneas de log y todos los pasos internos de esa misma solicitud, aunque haya
cientos de peticiones entre medias.

**Why this priority**: Es el problema que abre la issue. Hoy `Logger` de Nest
escribe texto plano sin ningún identificador, así que un incidente obliga a
reconstruir el flujo a mano leyendo logs sueltos: es el punto *Tracing* de
`docs/BACKEND_REVIEW.md` §7.4. Sin identificador correlacionable, las historias 2
a 7 no tienen sobre qué construirse.

**Independent Test**: Con la API levantada, `curl -i localhost:3000/healthz`
devuelve la cabecera `X-Request-Id`; al repetir la petición con
`-H "X-Request-Id: <uuid>"`, la respuesta devuelve ese mismo valor.

**Acceptance Scenarios**:

1. **Given** una petición sin cabecera `X-Request-Id`, **When** se procesa, **Then** la respuesta incluye `X-Request-Id` con un identificador generado de formato UUID v4.
2. **Given** una petición con `X-Request-Id` de formato UUID v4 válido, **When** se procesa, **Then** la respuesta devuelve exactamente ese identificador y no se genera otro.
3. **Given** una petición con `X-Request-Id` de formato inválido o demasiado largo, **When** se procesa, **Then** se genera un identificador nuevo y el valor recibido no se escribe en ninguna línea de log.
4. **Given** una petición con cabecera `traceparent` del estándar W3C Trace Context, **When** se procesa, **Then** el identificador de correlación se deriva de ella para poder interoperar con otro sistema que ya lo emita.

**Trazabilidad**: cubre el AC «Cada solicitud tiene identificador correlacionable en
logs y trazas» de #204.

---

### User Story 2 - La solicitud y sus pasos internos quedan persistidos (Priority: P1)

Como desarrollador, puedo consultar cuánto tardó una solicitud, con qué código
respondió, en qué entorno se ejecutó, qué usuario la hizo y en qué se dividió su
tiempo interno, sin depender de que el servidor siga en memoria ni de la salida
de consola.

**Why this priority**: Sin persistencia no hay visor: una traza que solo vive en
memoria se pierde justo cuando hace falta, que es durante y después del
incidente. También es lo que hace posible el AC «Se pueden localizar errores por
endpoint y despliegue», porque un filtro necesita datos consultables y no un
registro efímero.

**Independent Test**: Con la API levantada, `GET /traces?limit=1` devuelve una
traza con `correlation_id`, `metodo`, `ruta`, `estado_http`, `duracion_ms`,
`ambiente` y `fecha_inicio`.

**Acceptance Scenarios**:

1. **Given** una petición a un endpoint de negocio, **When** se completa con éxito, **Then** se persiste una traza con el código de estado devuelto y su duración en milisegundos.
2. **Given** una petición que falla, **When** se procesa, **Then** se persiste la traza con el código de error y un mensaje descriptivo, sin que la traza cambie el código de respuesta que recibe el cliente.
3. **Given** una traza con varios pasos internos, **When** se consulta en detalle, **Then** devuelve los pasos con su identificador de padre, lo que permite reconstruir el árbol.
4. **Given** dos peticiones distintas, **When** se persisten, **Then** sus identificadores de correlación son distintos y sus trazas no se mezclan.
5. **Given** la base de datos sin conexión, **When** una petición se procesa, **Then** la traza que no se pudo guardar se descarta sin propagar el error al cliente.

**Trazabilidad**: cubre el AC «Cada solicitud tiene identificador correlacionable en
logs y trazas» de #204 y da soporte al de «Se pueden localizar errores por
endpoint y despliegue».

---

### User Story 3 - El administrador localiza errores por endpoint y despliegue (Priority: P1)

Como administrador, puedo filtrar las solicitudes por servicio, método, ruta,
código de estado, entorno de despliegue y periodo, y encontrar rápido las que
fallaron.

**Why this priority**: Es el criterio de aceptación más operativo de la issue. La
utilidad de un visor se mide por si **encuentra el error**, no por cuántas filas
muestra; y un error de producción no puede confundirse con uno de desarrollo,
que es la confusión que el módulo de métricas ya resolvió con la etiqueta de
entorno (`FR-006` de la spec 005).

**Independent Test**: Con la API levantada, `GET /traces?estado=500&ambiente=production`
devuelve solo trazas de producción con error 500, y `GET /traces/:correlationId`
devuelve el detalle completo de una de ellas.

**Acceptance Scenarios**:

1. **Given** trazas de varios endpoints y estados, **When** se consulta la lista con un filtro de método y estado, **Then** todas las trazas devueltas cumplen ese filtro.
2. **Given** trazas de dos entornos de despliegue, **When** se filtra por entorno, **Then** solo aparecen las de ese entorno, y el valor proviene de la variable `DEPLOY_ENV`.
3. **Given** trazas de más de un servicio, **When** se filtra por servicio, **Then** solo aparecen las de ese servicio, y el valor proviene de `TRAZAS_SERVICIO`.
4. **Given** un periodo con fechas, **When** se filtra por rango, **Then** solo aparecen las comprendidas en él, y un rango invertido devuelve la lista vacía en lugar de un error.
5. **Given** una lista larga de trazas, **When** se solicita una página, **Then** la respuesta indica el total, la página y el tamaño, y las páginas no se solapan.
6. **Given** un `correlationId` que no existe, **When** se consulta su detalle, **Then** se responde `404` con un mensaje que no revela información sobre otras trazas.
7. **Given** un usuario sin rol `admin`, **When** consulta la lista o el detalle, **Then** se responde `403` y no se devuelve ningún dato de traza.

**Trazabilidad**: cubre el AC «Se pueden localizar errores por endpoint y
despliegue» de #204.

---

### User Story 4 - Ningún secreto ni dato sensible se registra (Priority: P1)

Como responsable de seguridad, puedo afirmar que las trazas y los registros no
contienen contraseñas, tokens, claves de API ni el cuerpo de las peticiones, y
que el filtrado ocurre **antes** de escribir, no después de leer.

**Why this priority**: Es un criterio de aceptación explícito de la issue y un
requisito del Principio II. La amenaza es concreta: el campo `datos_extra` del log
de actividad es un JSON libre y el de atributos del span lo sería igual, así que
un atributo sin vigilar acaba guardando un `Authorization` completo en la base de
datos de producción. Enmascarar en lectura no sirve de nada si el secreto ya se
escribió.

**Independent Test**: `RedactionService` recibe un objeto que contiene
`password`, `Authorization` y `access_token`, y la prueba falla si alguno de esos
valores aparece en la salida, o si la salida no contiene el marcador de
enmascarado.

**Acceptance Scenarios**:

1. **Given** atributos con claves que pueden contener secretos, **When** se redactan, **Then** su valor se sustituye por un marcador y la clave se conserva para saber qué se omitió.
2. **Given** un valor de texto muy largo, **When** se redacta, **Then** se trunca a una longitud máxima y se marca como truncado.
3. **Given** una cabecera de autorización con el formato `Bearer <jwt>`, **When** se redacta, **Then** solo se conserva el esquema, nunca el token.
4. **Given** un identificador de usuario, **When** se persiste la traza, **Then** se guarda para poder atribuir la acción, porque es un dato de auditoría y no un secreto.
5. **Given** una petición que falla, **When** se persiste su traza con el mensaje del error, **Then** ese mensaje pasa por la misma redacción que los atributos del paso.

**Trazabilidad**: cobre el AC «No se registran secretos ni datos sensibles
innecesarios» de #204.

---

### User Story 5 - El visor muestra los pasos internos de una traza (Priority: P2)

Como administrador, al abrir una traza veo cada paso interno con su nombre, su
duración y si terminó bien, de modo que veo de un vistazo en qué se fue el
tiempo.

**Why this priority**: Es lo que distingue un visor de trazabilidad de una tabla
más. La lista de la historia 3 dice **qué** falló; los pasos dicen **por qué**:
si los 900 ms fueron de la consulta a la base de datos o del propio código.
Depende de las historias 1 y 2, que son P1.

**Independent Test**: Con la API levantada, `GET /traces/:correlationId` devuelve
los pasos, y el visor los presenta anidados con su duración y su estado.

**Acceptance Scenarios**:

1. **Given** una traza con varios pasos anidados, **When** se abre en el visor, **Then** cada paso muestra su nombre, su duración y su estado, anidado bajo el paso del que depende.
2. **Given** un paso que falló, **When** se representa, **Then** se distingue visualmente de los que terminaron bien.
3. **Given** una traza sin pasos internos, **When** se abre, **Then** se muestra un mensaje que indique que no hay pasos desglosados.
4. **Given** una consulta que deja la lista vacía, **When** se filtran todos los criterios a la vez, **Then** se muestra un estado vacío explicativo y no una tabla en blanco.
5. **Given** una traza con muchos pasos, **When** se consulta, **Then** la lista se pagina y la consulta del detalle solo se hace para la traza abierta.

**Fuera de esta historia**: una representación en cascada o una barra de tiempo
proporcional. El alcance de #204 pide localizar errores por endpoint y
despliegue, y eso lo resuelve el listado y la duración de cada paso. La
proporción al inicio no añade información: los pasos se ejecutan en el orden en
que se listan, así que la barra dibujaría una posición que ya se conoce por la
indentación, a cambio de una dependencia de visualización que el repositorio no
tiene.

**Trazabilidad**: cubre el AC «Se pueden localizar errores por endpoint y
despliegue» de #204 desde la perspectiva visual, y da sentido a la palabra
*tracers* del alcance.

---

### User Story 6 - Se define cuánto se guarda y cuánto tiempo (Priority: P2)

Como administrador, sé que las trazas se purgan pasado un periodo configurable y
que puedo elegir el nivel a partir del cual se registran, sin que la base de datos
crezca sin límite.

**Why this priority**: Es la mitad del alcance de la issue («definir retención,
niveles de log»), y este spec cubre las dos. Es una condición para que la historia
2 sea segura de desplegar en producción. Sin purga, la base de datos de negocio
recibe miles de filas diarias y compite con el tráfico real; sin nivel mínimo, un
despliegue en desarrollo llena la tabla de trazas correctas que nadie va a mirar.
Es P2 porque el visor es útil sin esto en desarrollo, pero no lo es en producción.

**Independent Test**: Con el nivel mínimo fijado en `error` y trazas
persistidas, `TracingInterceptor` no escribe las de nivel `info`; con la retención
fijada a un día y trazas con fecha anterior, `PurgeTracesUseCase` las elimina y
devuelve el número de filas purgadas.

**Acceptance Scenarios**:

1. **Given** trazas más antiguas que el periodo de retención, **When** se ejecuta la purga, **Then** se eliminan y se devuelve cuántas se eliminaron.
2. **Given** trazas dentro del periodo de retención, **When** se ejecuta la purga, **Then** permanecen intactas.
3. **Given** el nivel mínimo configurado en `error`, **When** llegan peticiones correctas, **Then** no se persisten sus trazas; y **Given** una que falla, **When** se procesa, **Then** su traza sí se persiste, porque `error` es el nivel más alto de la escala.
4. **Given** un nivel, un nombre de servicio o un periodo de retención no numéricos o fuera de catálogo, **When** se resuelve la configuración, **Then** se usa el valor por defecto y se avisa por log, en vez de fallar el arranque.
5. **Given** una petición instrumentada de nivel `info` con el nivel mínimo en `info`, **When** se completa, **Then** su traza se persiste.

**Trazabilidad**: cubre la parte de «Definir retención, niveles de log y protección
de datos sensibles» del alcance de #204.

---

### User Story 7 - Formato, permisos y parámetros documentados (Priority: P2)

Como desarrollador o administrador que llega al visor sin contexto, encuentro un
documento que explica el contrato completo: qué cabeceras se propagan, qué campos
tiene una traza, qué parámetros aceptan los filtros, quién puede consultarlos y
cuánto tiempo se conservan los datos.

**Why this priority**: Es un criterio de aceptación explícito de la issue y una
exigencia de la constitución: la documentación debe actualizarse cuando cambia un
contrato. Un visor sin contrato documentado obliga a leer el código para saber qué
filtrar. Es P2 porque no bloquea la operación, pero sí su mantenimiento.

**Independent Test**: El documento existe y una comprobación automática verifica que
toda variable de entorno de trazabilidad declarada en el `.env.example` aparece
descrita en él y que todos los parámetros de los endpoints están listados.

**Acceptance Scenarios**:

1. **Given** un desarrollador que investiga una incidencia, **When** busca un identificador de correlación en el documento, **Then** encuentra dónde obtenerlo, cómo propagarlo y dónde queda registrado.
2. **Given** un administrador que configura el visor, **When** busca un parámetro de filtro, **Then** encuentra su nombre, su tipo, su límite y su valor por defecto.
3. **Given** un responsable de seguridad, **When** busca la política de datos sensibles, **Then** encuentra qué claves se enmascaran, qué se guarda a propósito y por qué.
4. **Given** cualquier persona del equipo, **When** busca la retención, **Then** encuentra el valor por defecto, cómo se cambia y qué ocurre mientras la purga no se ha ejecutado.
5. **Given** un cambio futuro en el contrato, **When** se revisa el documento, **Then** la desviación respecto de la decisión de stack de `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md` está justificada.

**Trazabilidad**: cubre el AC «Se documentan formato, retención, permisos y
parámetros» de #204.

---

### Edge Cases

- **`X-Request-Id` con formato UUID pero en mayúsculas o sin guiones** → se acepta
  solo con el formato exacto; cualquier otra variante se descarta y se genera uno
  nuevo. Aceptar formatos laxos permitiría inyectar saltos de línea en la salida de
  consola.
- **`X-Request-Id` con más de 64 caracteres** → se descarta y se genera uno nuevo.
  Sin este tope, un cliente podría escribir una cantidad arbitraria de datos por
  petición en la columna de correlación.
- **`traceparent` mal formado** (versión desconocida, longitud incorrecta) → se
  ignora en silencio y se genera un identificador propio. Un `traceparent` inválido
  no debe hacer fallar la petición.
- **Petición al propio visor (`GET /traces`)** → **nunca** se instrumenta. De lo
  contrario, cada consulta del administrador crearía una traza nueva y la lista
  nunca se estabilizaría.
- **`GET /metrics`, `/healthz` y `/health`** → **nunca** se instrumentan. Prometheus
  sondea `/metrics` cada 15 segundos: registrarlas generaría unas 5 760 filas
  diarias de ruido y, como la escritura de la traza también estaría instrumentada,
  podría realimentarse. Estas rutas se excluyen aunque el módulo de métricas de
  #214 todavía no exista en el momento de la integración.
- **Ruta con identificadores dinámicos** → se normaliza antes de persistir. Sin
  normalización, la cardinalidad dispersa las consultas e impide que el filtro por
  endpoint sea útil.
- **`datos_extra` del log de actividad en `null`** → la correlación se escribe en
  una clave propia y el resto del log se conserva; un log sin datos extra no es
  motivo para perder la correlación.
- **Rango de fechas con `desde` posterior a `hasta`** → devuelve la lista vacía con
  `200`, no un `400`. Es una consulta legítima sin resultados.
- **`limit` superior al máximo o inferior a uno** → se acota al rango permitido en
  lugar de rechazar la petición, para no romper la navegación del visor.
- **`correlationId` de una traza ya purgada** → responde `404` con el mismo mensaje
  que si nunca existió, para no revelar que el dato existió.
- **Petición sin token o con rol distinto de `admin`** → `401` o `403` del guard
  existente, sin filtrar información sobre el contenido de las trazas.
- **Purga concurrente con la escritura de una traza** → la traza en curso se
  completa y sobrevive a la purga; solo se eliminan las que ya superaron el periodo.

## Requirements *(mandatory)*

### Correlation ID

- **FR-001**: La API DEBE asignar un identificador de correlación a **toda**
  petición entrante y devolverlo en la cabecera de respuesta `X-Request-Id`.
- **FR-002**: Si la petición trae `X-Request-Id` con un formato UUID v4 válido, la
  API DEBE propagar ese valor; en caso contrario DEBE generar uno nuevo. El valor
  recibido NO DEBE persistirse ni registrarse sin validar y NO DEBE superar 64
  caracteres.
- **FR-003**: La API DEBE aceptar la cabecera `traceparent` del estándar W3C Trace
  Context y derivar de ella el identificador de correlación, ignorándola sin error
  si está mal formada.
- **FR-004**: El identificador DEBE estar disponible para los módulos internos sin
  que cada función lo reciba como parámetro.
- **FR-005**: La escritura del log de actividad DEBE incluir el identificador de
  correlación en el campo `datos_extra`, conservando el resto de la información que
  ya se guarda.
- **FR-006**: La API DEBE medir y registrar la duración de cada petición
  instrumentada, dado que hoy el interceptor de logs no la mide.

### Persistencia de trazas

- **FR-007**: DEBE existir un modelo `Trazas` con identificador de correlación
  único, servicio, método, ruta normalizada, código de estado, nivel, duración en
  milisegundos, entorno de despliegue, usuario y marcas de inicio y fin. La
  eliminación por retención es **física**, y es la excepción que la constitución
  exige justificar: una traza con borrado lógico seguiría ocupando el espacio que
  la retención existe para liberar.
- **FR-008**: DEBE existir un modelo `Spans` con identificador de traza,
  identificador de padre opcional, nombre, tipo, duración, estado, atributos y
  marca de inicio, con borrado en cascada de los hijos al eliminar la traza.
- **FR-009**: La persistencia DEBE definirse en el esquema de Prisma y entregarse
  mediante una migración revisada, siguiendo la convención de nombres
  `YYYYMMDDHHMMSS_descripcion` del repositorio.
- **FR-010**: Un fallo al escribir la traza NO DEBE alterar la respuesta que recibe
  el cliente ni impedir la ejecución de la petición.
- **FR-011**: El esquema DEBE permitir filtrar por servicio, método, ruta, código
  de estado, entorno y rango de fechas mediante índices que no obliguen a recorrer
  la tabla completa. No se indexa por usuario ni por correlación: ninguno de los
  dos es un filtro del listado, y un índice que nadie consulta solo encarece la
  escritura.

### Consulta de trazas

- **FR-012**: La API DEBE exponer `GET /traces` con los parámetros `page`, `limit`,
  `servicio`, `metodo`, `ruta`, `estado`, `ambiente`, `desde`, `hasta` e
  `includeTotal`, devolviendo total, página y tamaño junto a los datos. No DEBE
  admitir otros: un parámetro que el alcance de #204 no nombra es superficie de
  API que hay que mantener.
- **FR-013**: La API DEBE exponer `GET /traces/:correlationId` con la traza y sus
  pasos en estructura de árbol, y responder `404` si no existe.
- **FR-014**: Los parámetros de consulta DEBEN validarse con `class-validator` bajo
  el `ValidationPipe` global con `whitelist: true`, rechazando los desconocidos.
- **FR-015**: `page` DEBE empezar en uno, `limit` DEBE estar acotado y las páginas
  DEBEN ser disjuntas, sin repeticiones ni huecos.
- **FR-016**: La traza DEBE registrar su **servicio**, leído de `TRAZAS_SERVICIO`, y
  su **nivel**, derivado del código de respuesta (`info` por debajo de 400, `warn`
  en 4xx, `error` en 5xx o fallo), y ambos DEBEN ser filtrables por índice junto con
  el entorno. El servicio se persiste aunque hoy tenga un solo valor, para que el
  contrato no cambie cuando exista un segundo proceso.

### Protección de datos sensibles

> **Anonimización y control de acceso (CA de #207)**: la anonimización se
> resuelve en el punto de escritura con la redacción de `FR-017` a `FR-021`;
> `id_usuario` es la única identificación persistida y se conserva como dato
> de auditoría (`FR-018`, `data-model.md` § Seguridad de los datos). El control
> de acceso es `FR-022` y `FR-025`.

- **FR-017**: La redacción DEBE ejecutarse en el punto de escritura, antes de
  persistir, y NO DEBE ser un filtro aplicado en la lectura.
- **FR-018**: La redacción DEBE sustituir por un marcador los valores de las claves
  que puedan contener secretos, incluyendo al menos contraseña, token, autorización,
  clave de API y clave de servicio de Supabase, conservando el nombre de la clave.
- **FR-019**: La redacción DEBE truncar los valores de texto que superen una
  longitud máxima, dejando constancia del truncado.
- **FR-020**: La ruta persistida DEBE estar normalizada, sustituyendo los
  identificadores dinámicos por un marcador, para no dispersar la cardinalidad ni
  dejar identificadores de recurso en la base de datos.
- **FR-021**: El cuerpo de la petición y el de la respuesta NO DEBEN persistirse en
  los atributos de un span.

### Visor

- **FR-022**: DEBE existir una vista de administración de trazabilidad que liste las
  trazas y permita filtrarlas por los mismos parámetros del endpoint, y que solo
  sea accesible para el rol `admin`.
- **FR-023**: La vista DEBE presentar, al abrir una traza, sus pasos internos
  anidados, con su nombre, su duración y su estado. La presentación NO DEBE
  calcular la posición de un paso respecto al inicio de la traza: los pasos se
  ejecutan en orden, así que la anidación ya comunica la secuencia.
- **FR-024**: La vista DEBE distinguir los estados de carga, error y vacío, y exponer
  una forma de ampliar una fila para ver los atributos del paso.
- **FR-025**: La vista DEBE ser alcanzable desde la navegación del panel
  administrativo, en una ruta propia bajo el mismo guard de rol que el resto del
  panel.
- **FR-026**: La vista NO DEBE requerir una dependencia de grafos, de cronogramas o
  de visualización nueva, reutilizando los estilos ya presentes en el repositorio.

### Retención, configuración y documentación

- **FR-027**: DEBE existir un caso de uso de purga que elimine las trazas cuyo
  inicio sea anterior al periodo de retención, y devuelva cuántas eliminó.
- **FR-028**: La purga DEBE ejecutarse de forma programada y periódica, y su
  resultado DEBE quedar registrado.
- **FR-029**: El nivel mínimo de log, el nombre de servicio y el periodo de
  retención DEBEN ser configurables por variables de entorno, con valores por
  defecto seguros, y una configuración inválida NO DEBE impedir el arranque.
- **FR-030**: El entorno de despliegue DEBE obtenerse de `DEPLOY_ENV` y su valor
  DEBE ser uno de `development`, `staging` o `production`, en coherencia con el
  catálogo que valida `specs/005-modulo-metricas-monitoreo`.
- **FR-031**: NO DEBE existir una variable que desactive la trazabilidad por
  completo. Bajarla a `TRAZAS_NIVEL_MINIMO=error` —y solo entonces se guardan los
  fallos— es el mecanismo de cierre, y evita el estado intermedio en el que la
  instrumentación está activa pero parece apagada porque no se guarda nada.
- **FR-032**: DEBE existir un documento que describa el contrato de cabeceras, el
  formato de la traza y del paso, el esquema de la base de datos, todos los
  parámetros de los endpoints, los permisos exigidos y la política de retención.
- **FR-033**: El documento DEBE enumerar las claves que se enmascaran y las que se
  guardan a propósito, con el motivo de cada excepción.
- **FR-034**: La ruta `/traces` DEBE quedar excluida del middleware de redirección
  de `main.ts` y `X-Request-Id` DEBE admitirse en las cabeceras permitidas por
  CORS, porque de lo contrario el visor recibe un `302` en lugar de datos.

### Verificación

- **FR-035**: DEBE existir una prueba de extremo a extremo que demuestre la
  propagación: una petición con un identificador conocido debe devolverlo, y ese
  mismo identificador debe aparecer en la traza consultada y en el log de
  actividad de la mutación.
- **FR-036**: El PR de implementación DEBE adjuntar evidencia de que el visor
  funciona, con una captura y la salida de la prueba de propagación.
- **FR-037**: La cobertura del módulo de trazabilidad DEBE estar incluida en la
  configuración de Jest.

### Key Entities

- **Identificador de correlación**: valor de hasta 64 caracteres que identifica una
  solicitud a lo largo de toda su vida. Es único por traza, se devuelve en la
  respuesta y se propaga hacia el log y hacia los pasos internos.
- **Traza**: una petición completa. Guarda el servicio, el método, la ruta
  normalizada, el código de estado, el nivel, la duración total, el entorno, el
  usuario, el mensaje de error si lo hubo y las marcas de inicio y fin.
- **Paso (span)**: una operación interna con nombre, tipo, duración, estado,
  atributos y un identificador de padre opcional que permite reconstruir el árbol.
- **Nivel de traza**: severidad derivada del código de respuesta, `info` para
  menos de 400, `warn` para 4xx y `error` para 5xx o fallo. Es lo que decide si la
  traza se persiste cuando hay un nivel mínimo configurado.
- **Servicio**: nombre del proceso que atendió la petición, leído de
  `TRAZAS_SERVICIO`. Con un solo proceso su valor es constante, y por eso el filtro
  por servicio no descarta nada todavía; se añade ahora para que el contrato no
  cambie cuando exista un segundo servicio.
- **Entorno de despliegue**: `development`, `staging` o `production`, leído de
  `DEPLOY_ENV`.
- **Filtro de consulta**: conjunto de criterios (servicio, método, ruta, estado,
  entorno y rango de fechas) que acota el conjunto de trazas devuelto. La
  correlación no es un filtro del listado sino la clave del detalle, porque
  buscarla a través de páginas no es usable.
- **Política de retención**: número de días que se conservan las trazas antes de
  ser purgadas, configurable por entorno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las peticiones instrumentadas devuelven `X-Request-Id`, y
  el mismo valor aparece en la traza consultada y en el log de actividad de esa
  misma petición, verificado por la prueba de propagación.
- **SC-002**: Un administrador localiza todos los errores de un endpoint y de un
  entorno con una sola consulta, y la lista paginada no repite ni omite trazas.
- **SC-003**: Un intento de guardar una contraseña, un token o una clave de API en
  los atributos de un paso deja en la base de datos el marcador de enmascarado y el
  valor original en ningún sitio, demostrado por una prueba que falla si el secreto
  aparece.
- **SC-004**: La prueba de propagación y la evidencia del visor quedan adjuntas al
  PR de implementación, con la salida del caso Supertest y una captura.
- **SC-005**: Ninguna variable de entorno de trazabilidad queda sin documentar, y
  todos los parámetros de los dos endpoints aparecen en el documento de contrato.
- **SC-006**: Las tablas de trazas y pasos están cubiertas por la configuración de
  cobertura de Jest.
- **SC-007**: Con `TRAZAS_NIVEL_MINIMO=error`, la API responde con normalidad a las
  peticiones de negocio y no escribe ninguna fila de traza por las que terminan
  bien.
- **SC-008**: Con la retención fijada a un día, la purga programada elimina todas
  las trazas anteriores a esa fecha y deja intactas las posteriores.
- **SC-009**: Con el nivel mínimo en `error`, no se persiste ninguna traza de
  petición correcta, y `GET /traces?servicio=` acota por el valor de
  `TRAZAS_SERVICIO` sin recorrer la tabla completa.

## Desviaciones del alcance de #204

El alcance de #204 enumera cuatro compromisos. Este spec cubre los cinco criterios
de aceptación y **tres de los cuatro compromisos completos**. Un único fragmento
queda fuera a propósito, y se declara aquí para que la diferencia sea explícita y no
se lea como un olvido.

### «Centralizar y consultar registros estructurados» — parcial

**Qué sí se entrega**: un almacén de registros estructurados y consultable. Las
tablas `Trazas` y `Spans` tienen columnas tipadas, no texto libre, y se consultan
por índice a través de `GET /traces` y `GET /traces/:correlationId`, con su visor
en el panel de administración. Eso es un registro estructurado con consulta
estructurada.

**Qué no se entrega**: convertir los mensajes que la API ya escribía con `Logger`
de Nest en texto plano en registros JSON con campos separados. Este spec no toca
el formato de esos mensajes: solo les añade el identificador de correlación
(`FR-005`).

**Por qué**: migrar a `nestjs-pino` es una dependencia nueva y un cambio de
formato en toda la superficie de logs, que excede el objetivo de esta issue, cuyo
eje es la correlación y las trazas. El punto *Logs* de
`docs/BACKEND_REVIEW.md` §7.4 **sigue abierto** después de implementar este spec.

**Dónde queda**: punto *Logs* de `docs/BACKEND_REVIEW.md` §7.4, y tareas T049 y
T050 de `specs/005-modulo-metricas-monitoreo/tasks.md`.

### Los otros tres compromisos — completos

- **«Propagar correlation ID/trace ID entre servicios»**: cubierto por `FR-001` a
  `FR-006`. La propagación dentro del proceso es directa; entre servicios, el
  identificador acepta el `traceparent` del estándar W3C Trace Context (`FR-003`),
  que es el mecanismo de interoperabilidad para cuando exista un segundo proceso.
- **«Integrar trazas o rastros con filtros por servicio, operación, estado y
  periodo»**: cubierto por `FR-011`, `FR-012` y `FR-016`. Los cuatro filtros del
  texto de la issue existen: `servicio`, `metodo` y `ruta` para la operación,
  `estado`, y `desde` y `hasta` para el periodo.
- **«Definir retención, niveles de log y protección de datos sensibles»**: los tres
  entregables existen. La retención por `FR-027` y `FR-028`, el nivel de log por
  `FR-029` y `FR-031`, y la protección de datos por `FR-017` a `FR-021`.

## Out of Scope

- **OpenTelemetry como estándar de trazas distribuidas**: es la recomendación de
  `docs/BACKEND_REVIEW.md` §7.4 y la tarea T050 de la spec 005. Se descarta para
  este alcance por los criterios C2 y C4 de
  `docs/COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`, y la ruta de vuelta queda
  documentada en su §6.3.
- **Logs estructurados globales con `nestjs-pino`**: es el punto 2 de §7.8 y la
  tarea T049 de la spec 005. Esta issue entrega correlación y trazas, no un
  agregador de logs.
- **Trazas de llamadas salientes** a Supabase Auth o a servicios de terceros: el
  `SupabaseAuthGuard` queda dentro de la traza raíz, pero la llamada de red en sí
  no se descompone en pasos.
- **Analítica de negocio sobre las trazas**: el módulo `logs` ya expone los
  agregados de negocio del panel; esta issue no los duplica ni los mueve.
- **Almacenamiento de trazas a largo plazo** (Mimir, Thanos, un almacén dedicado):
  las trazas viven en la base de datos de negocio, con retención configurable.
- **Trazas de los trabajos programados**: los cron no se instrumentan. El único
  trabajo programado de este spec es la propia purga, y no hay ninguna petición
  entrante a la que correlacionarse.

## Dependencies

- **Issue #204** (este spec): implementación completa, backend y frontend.
- **Issue #214** y `specs/005-modulo-metricas-monitoreo`: el módulo de métricas
  aporta `DEPLOY_ENV` y su catálogo de entornos. Este spec **no modifica** los
  archivos de #214; solo reutiliza la variable de entorno y excluye `/metrics` y
  `/health` de la instrumentación para que las dos instrumentaciones convivan.
- `goblinhub-api/src/modules/logs/infrastructure/interceptors/activity-log.interceptor.ts`
  es el punto donde se añade la correlación y la duración, porque ya está
  registrado como interceptor global.
- `goblinhub-api/src/modules/logs/domain/repositories/log.repository.ts` aporta el
  patrón de token de inyección y de paginación que replica el módulo nuevo.
- `goblinhub_web/src/pages/admin/logs/LogsAdmin.css` contiene filtros, paginación,
  fila expandible y estilos de datos crudos que **existen pero no se usan**; el
  visor los reutiliza en vez de escribir estilos nuevos. `LogsAdmin.tsx` y
  `useLogs.ts` se leen como patrón y no se modifican.
- `docs/BACKEND_REVIEW.md` §7.4 y §7.8: origen del encargo y cierre de los puntos
  *Logs* y *Tracing* al terminar esta issue.

## Assumptions

- El backend sigue siendo un solo proceso sobre NestJS, sin servicios que
  intercambien tráfico entre sí. La ausencia de I/O entre microservicios es la
  razón principal para descartar OpenTelemetry en este alcance, y la razón por la
  que el filtro por servicio no descarta nada todavía.
- La base de datos de PostgreSQL admite el volumen de trazas con el nivel mínimo y
  la retención configurados. Si el volumen creciera, la ruta de evolución es un
  almacén dedicado, no cambiar el contrato de los endpoints.
- El rol `admin` es el único autorizado a consultar trazas, en coherencia con los
  cuatro endpoints que ya expone `LogController`.
- Se asume que el despliegue de Render mantiene siempre una instancia activa, como
  documenta `specs/005-modulo-metricas-monitoreo/spec.md`, por lo que no hay que
  distinguir una caída real de una instancia dormida.
- La verificación no incluye despliegues reales en la nube: la evidencia se
  produce levantando la aplicación en local, igual que en la spec 005.
- La duración de una petición se mide en milisegundos con resolución de reloj
  monotónico, no de reloj de pared, para que un ajuste de hora del sistema no
  produzca duraciones negativas.
