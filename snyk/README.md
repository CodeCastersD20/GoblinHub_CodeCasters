# Módulo AU — Seguridad automatizada con Snyk

Escaneo de seguridad ejecutándose **de forma automática en cada pull request y
push a `develop`/`main`**, con reporte publicado en el job, evidencia archivada
como artefacto y una política de severidades que decide qué bloquea el
pipeline. Es el módulo **AU** (automatización de seguridad) del ciclo de entrega
descrito en la issue [#213](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/213).

Complementa los módulos ya entregados: Playwright + MCP + IA (E2E, issue #168),
K6 (carga, #179–#183) y SonarQube (calidad estática, #184–#188).

| Documento | Contenido |
| --- | --- |
| [`README.md`](./README.md) (este archivo) | Configuración, ejecución local y en CI |
| [`POLITICA.md`](./POLITICA.md) | Umbrales, excepciones y proceso de remediación |
| [`RESULTADOS_SADRACH.md`](./RESULTADOS_SADRACH.md) | Evidencia de ejecución y limitaciones |
| [`../.snyk`](../.snyk) | Registro de excepciones que lee Snyk en cada escaneo |
| [`scripts/summarize.mjs`](./scripts/summarize.mjs) | Resumen Markdown + gate de la política |

## 1. Qué escanea

| Job | Tipo | Alcance | Modo |
| --- | --- | --- | --- |
| `dependencias` | Snyk Open Source | `goblinhub-api` y `goblinhub_web` (`package-lock.json`) | `snyk test` |
| `codigo` | Snyk Code (SAST) | Código de `goblinhub-api/src` y `goblinhub_web/src` | `snyk code test` |
| `infraestructura` | Snyk IaC | `infra/terraform` (misconfiguraciones) | `snyk iac test` |
| `autocomprobacion` | — | Pruebas del resumidor de reportes | `node --test` |

Los Dockerfiles (`goblinhub_web/Dockerfile`, `.devcontainer/Dockerfile`) se
escanean con `snyk container test` **fuera de CI**: la imagen hay que
publicarla en un registro antes de poder analizarla. El procedimiento está en
[§6](#6-escanear-imágenes-docker).

## 2. Configuración en GitHub Actions

Workflow: [`.github/workflows/snyk.yml`](../.github/workflows/snyk.yml)

| Evento | Cuándo se ejecuta |
| --- | --- |
| `pull_request` → `develop`, `main` | En cada PR (no depende de los archivos tocados: el check siempre está presente) |
| `push` → `develop`, `main` | Después de cada merge a las ramas de integración |
| `schedule` (lunes 06:17 UTC) | Barrido semanal sobre `main`, aunque nadie toque código |
| `workflow_dispatch` | Ejecución manual con el input `umbral` para simular otra política |

La credencial es un **secreto de Actions**, nunca un archivo del repo:

```
Settings > Secrets and variables > Actions > New repository secret
  nombre:  SNYK_TOKEN
  valor:   <token de Snyk>
```

Desde la terminal, con permisos de admin:

```bash
gh secret set SNYK_TOKEN -R CodeCastersD20/GoblinHub_CodeCasters
# pega el token cuando lo pida (no queda en el historial)
```

Si `SNYK_TOKEN` no está configurado —por ejemplo en PRs desde *forks*, donde
GitHub no expone secretos— los jobs de escaneo **no se ejecutan**: el paso
`Verificar secreto SNYK_TOKEN` emite un `::warning::` y el job termina en verde
declarando que el análisis fue omitido. Es deliberado: un pipeline verde sin
análisis debe ser visible, no silencioso.

### Obtener el token de Snyk

1. Crear una cuenta en <https://snyk.io> (plan gratuito) con el correo
   institucional y verificarlo. También sirve la cuenta de GitHub
   (*Sign up with GitHub*).
2. Al entrar por primera vez, Snyk ofrece el token en el onboarding; si se
   cerró esa pantalla: **avatar → My Account → API Tokens → Generate token**.
   Copiarlo y guardarlo en un gestor de contraseñas: solo se muestra una vez.
3. Registrarlo como secreto del repositorio con `gh secret set SNYK_TOKEN`
   (arriba) o desde *Settings → Secrets and variables → Actions*.
4. Para el CLI local: `snyk auth` (abre el navegador y hace lo mismo).

El plan gratuito basta para los tres escaneos de este módulo; no hace falta
tarjeta de crédito. El token es personal: si se filtra, se revoca desde la
misma pantalla y se genera uno nuevo.

### Gates

| Severidad | Efecto en el pipeline | SLA de remediación |
| --- | --- | --- |
| `critical` | **Bloquea** el PR y el push | 24 h |
| `high` | Se reporta (job summary + artefacto) | 7 días naturales |
| `medium` | Se reporta | 30 días naturales |
| `low` | Se reporta | 90 días naturales |

El gate lo aplica `scripts/summarize.mjs --gate critical`, que compara el
reporte JSON de Snyk contra el umbral de la política y **falla si el reporte no
se puede interpretar** (código de salida `2`), para no dejar pasar un escaneo
roto como si fuera limpio. Con `--gate high` (input manual del workflow) se
simula una política más estricta sin tocar el código.

Detalle completo y criterios de excepción en [`POLITICA.md`](./POLITICA.md).

## 3. Ejecución local

```bash
# 1. Instalar la CLI (una vez)
npm install -g snyk

# 2. Autenticarse (abre el navegador; el token se guarda en ~/.config/snyk)
snyk auth

# 3. Escanear y aplicar el gate con la política del equipo
cd goblinhub-api
snyk test --severity-threshold=low --json > /tmp/snyk-api.json
cd ../..
node snyk/scripts/summarize.mjs /tmp/snyk-api.json --gate critical --titulo "Dependencias — goblinhub-api"
echo $?     # 0 = sin hallazgos críticos, 1 = hay críticos, 2 = reporte ilegible

# SAST e IaC
snyk code test --severity-threshold=low --json > /tmp/snyk-codigo.json
snyk iac test infra/terraform --severity-threshold=low --json > /tmp/snyk-iac.json
node snyk/scripts/summarize.mjs /tmp/snyk-codigo.json --gate critical
node snyk/scripts/summarize.mjs /tmp/snyk-iac.json --gate critical
```

Sin credenciales, la misma base de datos de avisos (GitHub Advisory Database) se
consulta sin costo con `npm audit`, que es la evidencia usada en
[`RESULTADOS_SADRACH.md`](./RESULTADOS_SADRACH.md) mientras el equipo no tenga
token.

## 4. Pruebas del resumidor

```bash
node --test snyk/scripts/summarize.test.mjs
```

17 pruebas sobre los tres formatos de reporte que devuelve Snyk (dependencias,
SAST e IaC), la normalización de severidades, el conteo, el gate y los códigos
de salida. El job `autocomprobacion` las ejecuta en cada corrida, incluso sin
`SNYK_TOKEN`, para que un fallo del resumidor nunca pase inadvertido.

## 5. Evidencia que deja el pipeline

| Evidencia | Dónde |
| --- | --- |
| Tabla de hallazgos por severidad | *Job summary* de la corrida (visible en el PR sin abrir artefactos) |
| Reporte JSON completo | Artefacto `snyk-dependencias-{api,web}`, `snyk-codigo`, `snyk-iac` (retención 30 días) |
| Diff de dependencias | `package-lock.json` del commit, que es el insumo del escaneo |
| Evidencia narrativa por integrante | `snyk/RESULTADOS_*.md` (este módulo) y Google Docs / video de la actividad |

Si en el futuro se quiere además el reporte dentro de la pestaña **Security**
de GitHub, el paso `snyk code test` acepta
`--sarif-file-output=snyk-codigo.sarif` y se sube con `actions/upload-sarif@v3`
(requiere `security-events: write`, no disponible en PRs desde forks).

## 6. Escanear imágenes Docker

```bash
docker build -t goblinhub-web:local goblinhub_web --build-arg VITE_API_URL=<url>
snyk container test goblinhub-web:local --severity-threshold=high
```

`snyk container test` analiza imágenes publicadas en un registro; sobre una
imagen local funciona con la CLI autenticada, pero el resultado no queda
registrado en Snyk Code. Para seguimiento continuo hay que publicar la imagen
(`docker push`) y escanearla desde el pipeline de release.

## 7. Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `Authentication failed` | `SNYK_TOKEN` vacío o expirado: regenerar en Snyk y actualizar el secreto. El CLI local usa `snyk auth` |
| `Unknown option --severity-threshold` en `snyk code test` | Versión vieja de la CLI: `npm install -g snyk@latest` |
| El job termina en verde sin escanear | `SNYK_TOKEN` no configurado: se emite `::warning::`; configúralo y reejecuta |
| El resumen sale con código `2` | La CLI cambió el formato del reporte JSON: actualiza la CLI y, si persiste, ajusta `scripts/summarize.mjs` |
| `.snyk` no aplica la excepción | Snyk busca el archivo desde el manifiesto hacia arriba: consérvalo en la raíz del repo |
| `npm audit` y Snyk no coinciden | Distintos ELECTs: `npm audit` clasifica por CVSS, Snyk por su propio modelo. Manda el reporte de Snyk en CI |
