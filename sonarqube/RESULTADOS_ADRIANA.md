# Resultados — Escaneo SonarQube (PR asignado)

**Issue:** [#187](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/187)
**PR escaneado:** [Pull Request #197](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/197) — Prueba de carga K6 (GET /, p95 < 5s)
**Fecha de ejecución:** 2026-09-19/20 (21:37 local)
**Ejecutor:** Adriana Meza (Alfion72)

## 1. Stack local utilizado

| Componente | Versión |
| --- | --- |
| SonarQube | 9.9.8.100196 (Community, LTS) — Docker Compose + PostgreSQL 15 |
| Base de datos | `postgres:15` (stack de la issue de instalación #184) |
| sonar-scanner | 6.2.1.4610 (windows-x64) |
| Proyecto | `goblinhub` (raíz del repo) |
| Servidor | `http://localhost:9000` |

> El stack se levantó con el compose documentado en [`sonarqube/docker-compose.yml`](./docker-compose.yml):
> `docker compose -f sonarqube/docker-compose.yml up -d`. SonarQube LTS embebido de Docker
> (`sonarqube:lts-community`), sin dependencias instaladas; la cobertura se generó con
> `jest --coverage --coverageReporters=lcov` (32 suites / 203 tests OK).

## 2. Configuración

Archivo: [`sonarqube/sonar-project.properties`](./sonar-project.properties)

```bash
sonar.projectKey=goblinhub
sonar.projectName=GoblinHub
sonar.sources=.
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.spec.ts,**/*.test.ts,**/*.test.tsx,**/test/**,**/e2e/**,**/backups/**,**/prisma/**,**/playwright-report/**
sonar.javascript.lcov.reportPaths=goblinhub-api/coverage/lcov.info
```

## 3. Comando de escaneo

```powershell
$env:TOKEN = "<token>"
sonar-scanner "-Dsonar.host.url=http://localhost:9000" "-Dsonar.login=$env:TOKEN" `
  "-Dproject.settings=sonarqube/sonar-project.properties"
```

Resultado: `ANALYSIS SUCCESSFUL` / `EXECUTION SUCCESS` (300 archivos indexados, análisis ~4 min;
cobertura procedente de `jest --coverage --coverageReporters=lcov`, 32 suites / 203 tests OK).

## 4. Métricas de calidad (Overall Code)

| Métrica | Valor | Veredicto |
| --- | --- | --- |
| Quality Gate (`alert_status`) | **OK (Passed)** | ✅ |
| Bugs | **0** | ✅ |
| Vulnerabilidades | **0** | ✅ |
| Security Hotspots | **5** (todos `TO_REVIEW`) | ⚠️ pendientes de revisión |
| Code Smells | **6** | ⚠️ menor |
| Cobertura (`coverage`) | **87.1%** (775 líneas a cubrir, 89 sin cubrir) | ✅ |
| Densidad de duplicados | **0.3%** (2 bloques, 50 líneas, 2 archivos) | ⚠️ menor |
| Líneas de código (`ncloc`) | **5 113** | — |
| Rating fiabilidad (`reliability_rating`) | **1.0 (A)** | ✅ |
| Rating seguridad (`security_rating`) | **1.0 (A)** | ✅ |
| Rating mantenibilidad (`sqale_rating`) | **1.0 (A)** | ✅ |
| Rating revisión de seguridad | **5.0 (E)** por hotspots sin revisar | ⚠️ |
| Deuda técnica (missing effort) | 20 min | — |
| Complejidad / Funciones | 38 / 17 | — |

En el dashboard, el periodo **New Code** de esta versión muestra **0** bugs, **0** vulnerabilidades,
**0** hotspots y **0** code smells nuevos.

## 5. Detalle de issues (code smells)

| Severidad | Regla | Archivo |
| --- | --- | --- |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/Events/EventoDetalle/EventoDetalle.css` |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/products/ProductosDetalle/productsDetails.css` |
| MAJOR | `css:S4666` (x3) | `goblinhub_web/src/pages/register/register.css` |
| MINOR | `javascript:S1874` | `goblinhub-api/eslint.config.mjs` |

Los smells son de estilos CSS y una regla de deprecación en la config de ESLint; **ninguno** en el código del PR escaneado.

## 6. Detalle de security hotspots

| Estado | Regla | Archivo | Nota |
| --- | --- | --- | --- |
| TO_REVIEW | `javascript:S2068` | `k6/scripts/as_prueba.js` | Credencial falsa (bad path) del script de carga de otro integrante; no es una credencial real. |
| TO_REVIEW | `terraform:S6255` | `infra/terraform/main.tf` | Corresponde a IaC del integrante de infra. |
| TO_REVIEW | `terraform:S6281` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `terraform:S6249` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `docker:S6470` | `goblinhub_web/Dockerfile` | Corresponde al Dockerfile del frontend. |

Ninguno requiere mitigación inmediata para este PR (rutas de IaC/Docker de otros módulos y un
falso positivo del bad path ajeno).

## 7. Verificación del código del PR escaneado

El PR #197 agrega `k6/scripts/am_prueba.js` (script de carga GET /, 10 VUs) y `k6/RESULTADOS_ADRIANA.md`.

- Issues reportados sobre `k6/scripts/am_prueba.js`: **0** (bugs, vulnerabilidades y code smells).
- Security hotspots sobre `k6/scripts/am_prueba.js`: **0**.

El PR no introduce ningún hallazgo de calidad ni de seguridad en el análisis.

## 8. Veredicto

- **Quality Gate: APROBADO (OK)**.
- Cero bugs, cero vulnerabilidades, cobertura **87.1%**, duplicación **0.3%**, ratings **A/A/A**.
- El código del PR #197 presenta **0 issues y 0 hotspots**; el PR no introduce hallazgos asociados
  al scan. Los 6 smells y 5 hotspots del proyecto son preexistentes y ajenos al PR.
- Dashboard: <http://localhost:9000/dashboard?id=goblinhub>

## 9. Evidencia adicional

- Resumen del escaneo: `ANALYSIS SUCCESSFUL` / `EXECUTION SUCCESS` (300 archivos).
- Screenshot del dashboard: [`sonarqube/screenshot_adriana_dashboard.png`](./screenshot_adriana_dashboard.png)
  (Quality Gate "Passed").
- Configuración reproducible en [`sonarqube/README.md`](./README.md) (stack local con Docker
  Compose, issue de instalación #184).