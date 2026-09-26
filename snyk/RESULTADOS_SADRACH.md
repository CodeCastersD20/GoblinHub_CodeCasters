# Resultados del escaneo de seguridad — Sadrach34 (módulo AU, Snyk)

Evidencia de la implementación de la issue
[#213](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/213):
integración de Snyk en el pipeline, política de severidades y tratamiento de los
hallazgos existentes.

| Dato | Valor |
| --- | --- |
| Fecha de la medición | 2026-09-26 |
| Rama | `feat/213-modulo-au-snyk` (base: `develop` @ `2d39226`) |
| Entorno | Ubuntu, Node `v22.23.2`, npm `12.1.0` |
| Alcance | `goblinhub-api` (26 deps + 26 dev), `goblinhub_web` (8 deps + 21 dev), `infra/terraform` |
| Token de Snyk | **no disponible en el momento de esta medición** (ver §4) |

## 1. Qué se implementó y cómo se verifica

| Entregable | Archivo | Verificación |
| --- | --- | --- |
| Pipeline con 4 jobs | `.github/workflows/snyk.yml` | Ejecución en cada PR y push a `develop`; *workflow_dispatch* con input `umbral` |
| Gate de la política | `snyk/scripts/summarize.mjs` | `node --test snyk/scripts/summarize.test.mjs` → **17/17 pruebas** |
| Formatos de reporte soportados | `snyk/scripts/fixtures/*.json` | Fixtures de dependencias, SAST e IaC |
| Política de severidades y excepciones | `snyk/POLITICA.md`, `.snyk` | Revisado en el PR |
| Guía de configuración y operación | `snyk/README.md` | Pasos para obtener el token, ejecución local y en CI |

El job `autocomprobacion` ejecuta esas 17 pruebas en cada corrida del workflow,
**aunque no exista `SNYK_TOKEN`**: un fallo del gate nunca pasa inadvertido.

## 2. Ejecución del gate (salida real)

Con el reporte de ejemplo de dependencias (`--gate high` reproduce el caso
"hay severidades por encima del umbral"):

```
$ node snyk/scripts/summarize.mjs snyk/scripts/fixtures/reporte-dependencias.json \
    --gate high --titulo "Dependencias — goblinhub-api"
## Dependencias — goblinhub-api

Escaneo: **dependencias** · Hallazgos: **4** · Umbral bloqueante: `high`

| Severidad | Total |
| --- | --- |
| critical | 1 |
| high | 1 |
| medium | 1 |
| low | 1 |

**Resultado:** 2 hallazgo(s) en o por encima de `high` (bloqueante).

| Severidad | ID | Paquete / archivo | Hallazgo | Corrección |
| --- | --- | --- | --- | --- |
| critical | [SNYK-JS-SHARP-19653587](https://security.snyk.io/vuln/SNYK-JS-SHARP-19653587) | sharp@0.35.1 | Heap-based Buffer Overflow in sharp | 0.35.4 |
| high | [SNYK-JS-JSYAML-19496768](https://security.snyk.io/vuln/SNYK-JS-JSYAML-19496768) | js-yaml@4.1.0 | Allocation of Resources Without Limits or Throttling in js-yaml | 4.3.2 |

$ echo $?
1
```

Con `--gate critical` sobre el mismo reporte el gate pasa (exit `0`) y deja
constancia de los 3 hallazgos por debajo del umbral. Es exactamente el
comportamiento que verá el equipo: hoy las `high` se reportan, las `critical`
bloquean.

Pruebas del resumidor:

```
$ node --test snyk/scripts/summarize.test.mjs
# tests 17
# pass 17
# fail 0
```

## 3. Inventario real de vulnerabilidades (`npm audit`, 2026-09-26)

`npm audit` consulta la misma base de datos de avisos que Snyk (GitHub Advisory
Database) y no necesita credenciales, así que sirve como medición de respaldo
del estado del repositorio mientras el equipo no tenga token.

```
$ cd goblinhub-api && npm audit
13 vulnerabilities (3 moderate, 10 high)

$ cd goblinhub_web && npm audit
4 vulnerabilities (3 moderate, 1 high)
```

| Severidad | `goblinhub-api` | `goblinhub_web` | Total | Gate con umbral `critical` |
| --- | --- | --- | --- | --- |
| critical | 0 | 0 | 0 | No bloquea |
| high | 10 | 1 | 11 | Reporta (SLA 7 días) |
| medium | 3 | 3 | 6 | Reporta (SLA 30 días) |
| low | 0 | 0 | 0 | Reporta (SLA 90 días) |

Superficie de runtime (`npm audit --omit=dev`, solo dependencias que llegan a
producción):

| Proyecto | critical | high | medium | total |
| --- | --- | --- | --- | --- |
| `goblinhub-api` | 0 | 8 | 1 | 9 |
| `goblinhub_web` | 0 | 0 | 0 | 0 |

Los 4 hallazgos del frontend son **solo de desarrollo** (`vitest`,
`@vitest/mocker`, `@humanfs/node`, `js-yaml`): no afectan al bundle que se
despliega, pero se corrigen en el barrido por hygiene del lockfile.

Paquetes afectados y tratamiento (detalle en [`POLITICA.md` §4](./POLITICA.md)):

| Paquete | Severidad | Proyecto | Rango afectado | Corrección | Prioridad |
| --- | --- | --- | --- | --- | --- |
| `sharp` (0.35.1) | high | api | `<0.35.4` | `npm audit fix` → 0.35.4 | **1 — alcanzable** desde `POST /upload` |
| `multer` / `@nestjs/platform-express` | high | api | `<=2.2.0` / `<=11.2.5` | `npm audit fix` | **1 — alcanzable** desde el `multipart` de `POST /upload` |
| `js-yaml` (4.1.0) | high | api, web | `4.0.0 - 4.3.1` | `npm audit fix` → 4.3.2 | 2 — dependencia de tooling |
| `fast-uri` | high | api | `3.0.0 - 3.1.5` | `npm audit fix` | 2 — dependencia del CLI de Prisma |
| `browserslist` | high | api | (2 avisos activos) | `npm audit fix` | 2 — build (PostCSS/webpack) |
| `mysql2` | high | api | `<=3.23.0` | Requiere `prisma@6.19.3` (salto de major) | 3 — migración mayor aparte |
| `@prisma/config`, `prisma`, `deepmerge-ts` | high | api | `6.13.0-dev.1 - 8.1.0-dev.6` | Requiere `prisma@6.19.3` (salto de major) | 3 — migración mayor aparte |
| `qs` | medium | api | `2.2.5 - 6.15.3` | `npm audit fix` | 4 |
| `@humanfs/node` | medium | api, web | `<0.16.8` | `npm audit fix` | 4 |
| `baseline-browser-mapping` | medium | api | (1 aviso activo) | `npm audit fix` | 4 |
| `@vitest/mocker`, `vitest` | medium | web | `2.1.0 - 4.1.10` | `npm audit fix` | 4 — solo desarrollo |

8 de las 10 `high` de la API se resuelven con `npm audit fix` sin cambios
mayores; las 3 restantes comparten una sola causa (la cadena de Prisma) y
requieren una migración mayor que se planifica aparte.

**Hallazgo principal del módulo:** `sharp` y `multer` sí son alcanzables desde
una petición externa — el usuario envía el archivo que ambos procesan en
`POST /upload` y en la foto de perfil — así que el equipo los trata como
prioritarios aunque Snyk los clasifique `high` y el gate no los bloquee. Una
imagen AVIF manipulada o un `multipart` malformado llegaría al código
vulnerable.

## 4. Limitaciones de esta evidencia

1. **Sin `SNYK_TOKEN` no hay reporte nativo de Snyk.** El pipeline está
   implementado y probado con fixtures, pero la primera corrida real requiere
   que el equipo registre el secreto. Pasos exactos en
   [`README.md` §2](./README.md). Mientras tanto los jobs de escaneo se omiten
   con un `::warning::` visible, no en silencio.
2. **Snyk y `npm audit` no clasifican igual.** `npm audit` usa el CVSS del
   aviso; Snyk aplica su propio modelo y puede subir o bajar un nivel. Las cifras
   de la sección 3 son el piso de referencia, no el resultado oficial del módulo.
3. **SAST e IaC sin ejecución real.** `snyk code test` y `snyk iac test`
   requieren credenciales; lo verificado hasta ahora es que el resumen procesa
   correctamente sus formatos de reporte (fixtures) y que el gate decide bien.
4. **Escaneo de imágenes Docker fuera de CI.** `snyk container test` necesita la
   imagen publicada en un registro; queda documentado en
   [`README.md` §6](./README.md) como paso manual.
5. **Sin línea base de "vulnerabilidades nuevas".** El gate compara contra el
   umbral, no contra el commit anterior: una `critical` preexistente bloquearía
   aunque nadie la introdujera. Se resuelve con la promoción de `high` a
   bloqueante una vez limpio el inventario heredado.

## 5. Cómo completar la evidencia con Snyk

```bash
# 1. Registrar el secreto (una vez, con permisos de admin)
gh secret set SNYK_TOKEN -R CodeCastersD20/GoblinHub_CodeCasters

# 2. Lanzar el pipeline sobre la rama del PR
gh workflow run snyk.yml --ref feat/213-modulo-au-snyk -f umbral=critical

# 3. Descargar los reportes y resumirlos
gh run download <run-id> -n snyk-dependencias-api
gh run download <run-id> -n snyk-codigo
gh run download <run-id> -n snyk-iac
node snyk/scripts/summarize.mjs snyk-dependencias-api/snyk-dependencias-api.json --gate critical
```

Lo que se agrega a este documento cuando exista el token:

- Tabla de hallazgos por severidad de los tres escaneos (output del paso 3).
- Enlace a la corrida de CI con el *job summary* y los artefactos (evidencia
  consultable durante la revisión del PR).
- Captura de pantalla de Snyk con el reporte del proyecto, para el Google Docs y
  el video de la actividad.
