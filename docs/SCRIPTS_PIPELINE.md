# Documentación de Scripts del Pipeline (GoblinHub)

Esta guía explica cómo ejecutar de forma segura, predecible y estandarizada todas las etapas de integración y entrega continua de nuestro monorepo, tanto en la máquina local de cualquier desarrollador como en GitHub Actions.

## 🌟 Principios de Diseño
- **Paridad 1:1 (Local y CI):** Los mismos comandos exactos que verifican tu código en local son los que se ejecutan en la nube.
- **Idempotencia:** Si ejecutas el script de instalación (`prepare_env.sh`) tres veces seguidas, el resultado será exactamente el mismo sin errores.
- **Fail-Fast (Bloqueo temprano):** Todos los scripts emplean `set -euo pipefail`. Cualquier linter fallido o test roto abortará la cadena de inmediato (`exit 1`).

## 🛠 Orquestador Principal (`pipeline.sh`)

La forma más sencilla de interactuar con el ecosistema es usando el orquestador unificado ubicado en `scripts/pipeline.sh`.

### Comandos de Etapas

Puedes ejecutar todo el ciclo de vida o fases individuales:

| Comando | Descripción | Qué hace por dentro |
|---|---|---|
| `bash scripts/pipeline.sh setup` | Prepara el entorno. | Limpia temporales (`.release/`), instala dependencias de forma determinista (`npm ci`) para API y Web, y genera el cliente de Prisma. |
| `bash scripts/pipeline.sh integration` | Validación estática. | Ejecuta linter (`eslint`), type-check estricto (`tsc --noEmit`) y compila (`build`) para ambos proyectos. |
| `bash scripts/pipeline.sh test` | Pruebas automáticas. | Corre la suite de testing (Jest / Vitest / Playwright). |
| `bash scripts/pipeline.sh release` | Empaquetado. | Genera la versión semántica (CalVer + Git SHA), comprime artefactos en `.tar.gz`, calcula suma SHA256 y crea el manifiesto JSON. |
| `bash scripts/pipeline.sh deploy` | Despliegue seguro. | Llama a `deploy_and_verify.sh development`, lanza el webhook y realiza reintentos contra `/health`. |
| `bash scripts/pipeline.sh all` | (Por defecto). | Ejecuta secuencialmente: `setup` → `integration` → `test` → `release`. |

## 🧪 Pruebas Automáticas de los Scripts (`test_pipeline_scripts.sh`)

Para garantizar que nuestros scripts bash no tengan bugs (como "falsos positivos" donde un linter falla pero el script devuelve 0), contamos con nuestra propia **Suite de Pruebas en Bash**.

Para ejecutarla:
```bash
bash scripts/test/test_pipeline_scripts.sh
```

Esta suite:
1. Verifica que la instalación de dependencias sea 100% idempotente.
2. Inyecta un linter que falla intencionalmente para validar que `run_integration.sh` lo detecte y se bloquee.
3. Asegura que los empaquetados compriman correctamente los binarios y generen sumas de verificación.
4. Levanta servidores web (mocks) locales en puertos efímeros simulando un Healthcheck exitoso (HTTP 200) y uno fallido (HTTP 500) para garantizar que el Rollback se dispara con precisión.

## 🔑 Variables de Entorno para Despliegues Locales
Si necesitas simular un despliegue y su Rollback desde tu terminal sin tocar producción, exporta estas variables antes de llamar a `deploy`:

```bash
export ENVIRONMENT_NAME="development"
export DEPLOY_HOOK_URL="https://httpstat.us/200"     # Webhook para desplegar
export ROLLBACK_HOOK_URL="https://httpstat.us/200"   # Webhook para revertir
export HEALTHCHECK_URL="https://httpstat.us/404"     # Endpoint para fallar/acertar
```
