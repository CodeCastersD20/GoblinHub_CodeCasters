# Trazabilidad de peticiones

Documento de referencia de la trazabilidad implementada en la issue
[#204](https://github.com/GoblinHub/GoblinHub_CodeCasters/issues/204). Describe
cómo se identifica una petición, cómo se guarda, cómo se consulta, cuánto se
conserva y qué se elimina antes de escribir.

Responde a tres preguntas del alcance: **localizar un error a partir del
endpoint y el despliegue que lo produjeron**, **correlacionar esa petición con
sus registros de actividad** y **no guardar datos sensibles**.

---

## 1. El identificador de correlación

Toda petición HTTP que atraviesa la API recibe un identificador de correlación
antes de que se ejecute ningún interceptor. Vive en
`TracingContextService`, que usa `AsyncLocalStorage`, de modo que cualquier
código que se ejecute dentro de la petición lo lee sin que se lo pasen por
parámetro.

### De dónde sale

`CorrelationIdMiddleware` lo resuelve en este orden:

1. La cabecera **`X-Request-Id`** del cliente, si es un UUID v4 en minúsculas de
   hasta 64 caracteres.
2. El `trace-id` de la cabecera **`traceparent`** (W3C Trace Context), si está
   bien formada. Esto permite que una petición que llega de otro servicio
   conserve el mismo identificador y que las trazas de ambos queden unidas.
3. Un UUID v4 nuevo.

Cualquier otro valor se descarta y se genera uno propio. No se hace esto por
rigidez de formato: el identificador se devuelve en la cabecera de respuesta y
se escribe en la base de datos, así que aceptar un valor libre permitiría que
un cliente escribiera saltos de línea en los registros o contaminara la búsqueda
de otro usuario con una correlación falsa.

### Dónde se puede ver

| Lugar | Campo |
| --- | --- |
| Cabecera de respuesta | `X-Request-Id` |
| Cabecera aceptada del cliente | `X-Request-Id` o `traceparent` |
| Traza | `trazas.correlation_id` |
| Log de actividad | `logs_actividad.datos_extra.correlationId` |
| Log de traza en consola | `No se pudo guardar la traza <correlation_id>` |

Para pasar de una respuesta fallida a sus registros, se copia el valor de
`X-Request-Id` y se busca en el visor. Es el único dato que hace falta.

### Cómo se propaga a los logs

`ActivityLogInterceptor` lee el identificador del contexto y lo escribe en
`datos_extra.correlationId` del registro de actividad, tanto en el camino feliz
como en el de error. La escritura de la traza y la del log son independientes:
si la base de datos rechaza una, la otra se sigue intentando, porque perder una
de las dos mitades rompería la correlación justo en el caso que importa.

---

## 2. Qué se guarda

### Traza

Una fila por petición instrumentada, en la tabla `trazas`:

| Columna | Contenido |
| --- | --- |
| `id_traza` | Identificador interno de la traza |
| `correlation_id` | UUID v4, el mismo que va en `X-Request-Id` |
| `servicio` | Valor de `TRAZAS_SERVICIO` (por defecto `goblinhub-api`) |
| `metodo` | Verbo HTTP en mayúsculas |
| `ruta` | Ruta **normalizada**, con los identificadores sustituidos por `:id` |
| `estado_http` | Código de respuesta |
| `nivel` | `info`, `warn` o `error` |
| `duracion_ms` | Milisegundos de la petición completa |
| `ambiente` | Entorno de despliegue, de `DEPLOY_ENV` |
| `id_usuario` | Usuario autenticado, o `null` |
| `error` | Mensaje del error, redactado y recortado; `null` si no hubo |
| `fecha_inicio` / `fecha_fin` | Instantes de entrada y de salida |

La normalización de la ruta es lo que hace que el filtro por endpoint funcione:
`/events/8f3a-…` y `/events/1b2c-…` se guardan ambas como `/events/:id`. Sin
ello, cada petición tendría su propio valor de `ruta` y el filtro no
encontraría nada.

### Pasos

Las filas de `spans` cuelgan de la traza mediante `traza_id` y, entre ellas,
mediante `parent_id`. Cada paso tiene `nombre`, `tipo` (`http`, `auth`,
`prisma`, `cron`, `redis`), `duracion_ms`, `estado` (`ok` o `error`),
`atributos` y `fecha_inicio`.

Los pasos son la granularidad mínima que el visor necesita: saber cuánto tardó
cada parte. Un desglose más fino no se justifica con los datos disponibles.

### Qué no se instrumenta

Las rutas cuyo prefijo es `/traces`, `/metrics` o `/health` no se instrumentan.
La comparación es por segmentos y no con `includes`, para que `/traces-listo`
sí se instrumente. Excluir el propio observabilidad evita que cada consulta al
visor o cada comprobación de vida multiplique el volumen de trazas.

---

## 3. Niveles

El nivel de una traza se deriva de su código de respuesta, no se decide a mano:

| Código de respuesta | Nivel |
| --- | --- |
| Menor de 400 | `info` |
| De 400 a 499 | `warn` |
| De 500 a 599 | `error` |

`TRAZAS_NIVEL_MINIMO` decide a partir de qué nivel se guarda. El corte ocurre
antes de escribir, no después de filtrar: con el mínimo en `error` no se gasta
una transacción en una traza que nadie va a consultar. El valor por defecto es
`info`, es decir, se guarda todo.

---

## 4. Retención

`TRAZAS_RETENCION_DIAS` fija cuántos días se conservan las trazas. El valor por
defecto es `7`.

Un trabajo programado (`17 3 * * *`, las 03:17) borra las trazas iniciadas antes
del instante de vencimiento y, en cascada, sus pasos. El minuto 17 evita que
varias instancias desplegadas a la vez purguen en el mismo segundo.

El borrado es **físico**. Es la excepción que la constitución exige justificar
cuando la regla general es no borrar, y aquí se justifica: una traza retenida
con soft-delete seguiría ocupando el espacio que la retención existe para
liberar, y su clave de correlación no podría volver a usarse.

Las trazas son datos de diagnóstico, no un registro de negocio: los datos que
hay que conservar por obligación legal o para auditar a una persona están en los
registros de actividad, que no se purgan.

---

## 5. Datos sensibles

La redacción ocurre **antes de escribir en la base de datos**, no al leer. Un
secreto que llega a la columna es un secreto que ya está en la base.

`RedactionService` sustituye por `[REDACTADO]` el valor de toda clave cuyo
nombre, normalizado a minúsculas y sin `_`, `-` ni `.`, contenga uno de estos
términos:

```
password · passwd · secret · token · authorization · apikey
servicekey · privatekey · credential · refreshtoken · accesstoken
```

Al normalizar, `access_token`, `accessToken` y `ACCESS-TOKEN` caen en el mismo
caso, que es como aparecen en la práctica.

Dos claves se conservan a propósito pese a contener datos de negocio:

- `id_usuario`: sin él no se puede atribuir la acción a una persona.
- `correlationId`: no es un secreto, es lo que une la traza con el log.

Cualquier otro valor de texto se recorta a 512 caracteres y se marca con
`[TRUNCADO]`, para que un mensaje largo no ocupe la fila entera ni se lea como
completo. El mensaje de error de la traza pasa por la misma redacción: un
`throw` puede llevar en el mensaje justo el valor que se negaba a guardar.

**Lo que esta política no cubre:** el enmascarado decide por el nombre de la
clave, no por el contenido. Un secreto incrustado en el valor de una clave
benigna —`api_key=sk-1234` dentro de un `mensaje`— no se detecta y se guarda.
Quien añada un span debe pasar los atributos por `RedactionService` y no
construir el objeto a mano.

---

## 6. Configuración

Las tres variables son opcionales y tolerantes: si faltan se usa el valor por
defecto, y si su valor es inválido la API lo avisa por log y **arranca igual**.
La instrumentación está en el camino caliente de cada petición y una variable
mal puesta no puede ser motivo de que el servicio no levante.

| Variable | Valores | Por defecto | Para qué |
| --- | --- | --- | --- |
| `TRAZAS_SERVICIO` | Texto | `goblinhub-api` | Nombre con el que se filtra en el visor |
| `TRAZAS_NIVEL_MINIMO` | `info`, `warn`, `error` | `info` | Nivel a partir del cual se guarda |
| `TRAZAS_RETENCION_DIAS` | Entero mayor que 0 | `7` | Días que se conservan antes de purgar |
| `DEPLOY_ENV` | Catálogo de despliegue | `development` | Entorno que se guarda en la traza y se filtra |

`DEPLOY_ENV` es la misma variable que usa el tablero de métricas, y comparte su
catálogo a propósito: si el tablero y el visor aceptaran entornos distintos, un
filtro de uno no encontraría nada en el otro.

No hay ninguna variable para activar o desactivar la trazabilidad. Apagarla
significa subir el nivel mínimo a `error`, y entonces solo se guardan los
fallos, que es el volumen más bajo antes de un despliegue.

---

## 7. Permisos

Los dos endpoints de consulta exigen rol **`admin`**, el mismo rol que ya
gestiona el panel de administración. Un usuario que no lo tenga recibe `401` si
no está autenticado y `403` si lo está pero su rol no sirve.

No hay ningún endpoint para escribir, modificar o borrar trazas. Se instrumentan
solas y se purgan solas; nadie las edita.

Las trazas se consultan **por el identificador de correlación** en el detalle y
**por filtros** en el listado. No hay filtro por `correlationId` en el listado:
con paginación, buscar una correlación concreta entre miles de páginas no es
usable, y para eso está el detalle.

---

## 8. API

### `GET /traces`

Lista trazas, de la más reciente a la más antigua. Requiere `admin`.

| Parámetro | Tipo | Notas |
| --- | --- | --- |
| `servicio` | Texto (≤ 60) | Coincidencia por el nombre del servicio |
| `metodo` | Texto (≤ 10) | Se normaliza a mayúsculas: `get` y `GET` son lo mismo |
| `ruta` | Texto (≤ 200) | Prefijo de la ruta ya normalizada |
| `estado` | Entero (100-599) | Código exacto: un `401` es información, no ruido |
| `ambiente` | Texto (≤ 20) | Entorno de despliegue |
| `desde` | ISO 8601 | Extremo izquierdo del rango |
| `hasta` | ISO 8601 | Extremo derecho del rango |
| `page` | Entero ≥ 1 | Por defecto `1` |
| `limit` | Entero 1-200 | Por defecto `50`. Fuera de rango se acota, no se rechaza |
| `includeTotal` | Booleano | Por defecto `false`. El `COUNT` es la parte cara de la consulta |

Respuesta:

```json
{
  "data": [
    {
      "id_traza": "…",
      "correlation_id": "3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73",
      "servicio": "goblinhub-api",
      "metodo": "GET",
      "ruta": "/events/:id",
      "estado_http": 500,
      "nivel": "error",
      "duracion_ms": 4310,
      "ambiente": "production",
      "id_usuario": "…",
      "error": "…",
      "fecha_inicio": "2026-01-01T10:00:00.000Z",
      "fecha_fin": "2026-01-01T10:00:04.310Z"
    }
  ],
  "total": 128,
  "page": 1,
  "limit": 50
}
```

`total` es `null` cuando no se pidió con `includeTotal`. Distinguirlo de `0`
importa: cero afirma que no hay resultados, y `null` afirma que no se ha
preguntado.

Un `desde` posterior al `hasta` devuelve la lista vacía, no un error: es una
consulta sin resultados, no una consulta mal formada.

### `GET /traces/:correlationId`

Devuelve la traza y sus pasos, con los hijos anidados:

```json
{
  "traza": { "…": "igual que en el listado" },
  "pasos": [
    {
      "id_span": "…",
      "parent_id": null,
      "nombre": "petición",
      "tipo": "http",
      "duracion_ms": 4310,
      "estado": "ok",
      "atributos": { "ruta": "/events/:id" },
      "fecha_inicio": "2026-01-01T10:00:00.000Z",
      "hijos": []
    }
  ]
}
```

Los pasos vienen en la misma respuesta que la traza para que el visor no
necesite dos viajes al servidor para pintar una pantalla. Un `404` significa que
no hay ninguna traza con ese identificador.

---

## 9. El visor

`/admin/trazas`, en el panel de administración, con el mismo permiso `admin`.

La pantalla tiene una fila por traza con su servicio, su operación, su estado
coloreado por severidad, su duración y su despliegue. Los filtros son los
mismos siete parámetros del listado, y al cambiar cualquiera de ellos se vuelve
a la primera página. Al abrir una fila se pide el detalle y se muestran los
pasos anidados con su duración, su estado y sus atributos ya redactados.

El recorrido de los pasos es una lista anidada y no un diagrama de cascada: lo
que hace falta de un paso es cuánto tardó y si falló, y una lista dice lo mismo
sin calcular posiciones ni añadir al proyecto una biblioteca de visualización
que no usa.

---

## 10. Pruebas

| Suite | Qué cubre |
| --- | --- |
| `src/modules/tracing/**/*.spec.ts` | Resolución del identificador, normalización de rutas, redacción, niveles, retención, mapeo de Prisma y validación de los parámetros |
| `test/traces.e2e-spec.ts` | Contrato HTTP de los dos endpoints: códigos, validación, forma de la respuesta y permisos |
| `test/tracing-propagation.e2e-spec.ts` | Que la traza y el log de una misma petición lleven el mismo identificador, incluidos el camino de error, la adopción de `traceparent` y el rechazo de un valor manipulado |
| `goblinhub_web/src/pages/admin/trazas/TrazasAdmin.test.tsx` | Listado, filtros, paginación, estado vacío, error y detalle del visor |

Los identificadores de las pruebas son sintéticos (`corr-1`,
`3f8c1e2a-…`) y no proceden de una ejecución real: las pruebas no dependen de
que haya peticiones registradas en la base de datos.

---

## 11. Lo que este documento no cubre

- **Métricas**: viven en el módulo de métricas y en
  [`RUNBOOK_MONITOREO.md`](RUNBOOK_MONITOREO.md). Una traza explica una
  petición concreta; una métrica explica una tendencia.
- **Comparativa de herramientas**: está en
  [`COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md`](COMPARATIVA_HERRAMIENTAS_TRAZABILIDAD.md)
  y es el documento que justifica por qué se eligió implementar esto en lugar
  de adoptar un proveedor.
