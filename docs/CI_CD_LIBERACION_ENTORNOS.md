# Arquitectura de Liberación Continua y Entornos (GoblinHub)

Este documento describe la arquitectura y configuración del pipeline de Integración y Entrega Continua (CI/CD) para el proyecto GoblinHub.

## 1. Arquitectura del Pipeline

El pipeline de GitHub Actions (`.github/workflows/release-cd.yml`) está dividido en jobs secuenciales:
1. **Integration**: Ejecuta validaciones estáticas (`lint`, `type-check`) y la compilación inicial del código.
2. **Tests**: Ejecuta las pruebas automatizadas (aisladas mediante el script `run_release_tests.sh`). Si este paso falla, se bloquea la liberación.
3. **Release**: Genera el tag oficial (`vYYYY.MM.DD-<sha>`), empaqueta los binarios y publica el artefacto validado en GitHub.
4. **Deploy Development**: Se dispara automáticamente si los pasos anteriores son exitosos en la rama `develop`.
5. **Deploy Staging**: Promueve el código tras `development`.
6. **Deploy Production**: Promueve el código exclusivamente en la rama `main` o vía aprobación manual.

## 2. Variables y Secretos de Entornos (GitHub Environments)

Para que el pipeline funcione correctamente sin exponer credenciales, es necesario configurar los siguientes entornos (Environments) en GitHub Settings:

| Environment | Tipo | Clave | Descripción |
|---|---|---|---|
| `development` / `staging` / `production` | **Secret** | `DEPLOY_HOOK_URL` | Webhook de Render para iniciar el despliegue automático de este entorno específico. |
| `development` / `staging` / `production` | **Secret** | `ROLLBACK_HOOK_URL` | Webhook de despliegue de una versión anterior o un fallback (Render). |
| `development` / `staging` / `production` | **Variable** (`vars`) | `HEALTHCHECK_URL` | URL pública de este entorno (ej. `https://api-staging.onrender.com/health`) para validación. |

## 3. Reglas de Promoción y Protección

- **Rama `develop`**: Al realizar un push o merge, el pipeline ejecuta `integration -> tests -> release` y despliega en `development` y luego en `staging`.
- **Rama `main`**: Al realizar un push o merge (tras PR validado), ejecuta `integration -> tests -> release` (generando Tag de versión de Git) y despliega directamente a `production`.
- **Aprobaciones Manuales**: Los entornos de `staging` y `production` deben tener habilitada la protección *"Required reviewers"* en GitHub Environments, para que el pipeline se pause esperando autorización humana antes de invocar el script de despliegue.

## 4. Versionado y Artefactos

Se utiliza una estrategia de nombrado híbrida (CalVer + SHA):
- Formato: `vYYYY.MM.DD-<short_sha>` (Ejemplo: `v2026.09.20-1a2b3c4`).
- **Retención**: Los artefactos empaquetados (`.tar.gz`) se guardan en Actions durante 7 días y pueden descargarse para auditorías o despliegues locales.
- **Git Tags**: Los tags se empujan automáticamente en las versiones liberadas hacia la rama `main`.

## 5. Estrategia de Verificación y Rollback Automático

El despliegue está protegido por un healthcheck con validación estricta post-lanzamiento.
El script `scripts/deploy/deploy_and_verify.sh`:
1. Invoca el Deploy Hook.
2. Realiza sondeos continuos al `HEALTHCHECK_URL` por 30 segundos (`6 reintentos x 5s`).
3. Si recibe un código `HTTP 200`, se considera la liberación exitosa y actualiza el Markdown en el Action Summary.
4. Si agota el tiempo o falla, invoca inmediatamente el `ROLLBACK_HOOK_URL`, aborta el pipeline (`exit 1`) y documenta el incidente en el resumen de GitHub Actions. También es posible disparar rollbacks manuales usando eventos de `workflow_dispatch`.
