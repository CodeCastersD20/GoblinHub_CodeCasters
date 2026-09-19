# Resultados — Escaneo SonarQube (PR asignado)

**Issue:** [#188](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/188)
**PR escaneado:** [Pull Request #193](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/193) — Prueba de carga K6 (GET /productos, p95 < 5s)
**Fecha de ejecución:** 2026-09-18
**Ejecutor:** Adrián Eduardo Santos Rosales (AdrianS-127)

## 1. Stack local utilizado

| Componente | Versión |
| --- | --- |
| SonarQube | 9.9.5.90363 (Community, LTS) — embedded H2 |
| sonar-scanner | 6.2.1.4610 (linux-x64) |
| JDK | OpenJDK 17.0.20.1 (Temurin, portable) |
| Base del análisis | Raíz del repo (proyecto `goblinhub`) |
| Servidor | `http://localhost:9000` |

> El stack se levantó **sin Docker** (no disponible en el entorno): SonarQube LTS descargado,
> JDK 17 portable vía `SONAR_JAVA_PATH`, H2 embebido (default de la edición Community LTS).
> Pasos reproducibles en [`sonarqube/README.md`](./README.md) (issue de instalación #184).

## 2. Configuración

Archivo: [`sonarqube/sonar-project.properties`](./sonar-project.properties)

```bash
sonar.projectKey=goblinhub
sonar.projectName=GoblinHub
sonar.sources=.
sonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/*.spec.ts,**/*.test.ts,**/*.test.tsx,**/test/**,**/e2e/**,**/backups/**,**/prisma/**,**/playwright-report/**
sonar.javascript.lcov.reportPaths=/tmp/opencode/sonar/lcov/lcov.info
```

## 3. Comando de escaneo

```bash
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login=$TOKEN \
  -Dsonar.scm.disabled=true -Dproject.settings=sonarqube/sonar-project.properties
```

Resultado: `ANALYSIS SUCCESSFUL` (182 archivos analizados, análisis 9.3 s; cobertura procedente
de `jest --coverage --coverageReporters=lcov`, 31 suites / 194 tests OK).

## 4. Métricas de calidad

| Métrica | Valor | Veredicto |
| --- | --- | --- |
| Quality Gate (`alert_status`) | **OK** | APROBADO |
| Bugs | **0** | OK |
| Vulnerabilidades | **0** | OK |
| Security Hotspots | **5** (todos `TO_REVIEW`) | PENDIENTES de revisión |
| Code Smells | **6** | MENOR |
| Cobertura (`coverage`) | **87.4%** (770 líneas a cubrir, 84 sin cubrir) | OK |
| Densidad de duplicados | **0.3%** (2 bloques, 50 líneas, 2 archivos) | MENOR |
| Líneas de código (`ncloc`) | **5 074** | — |
| Rating fiabilidad (`reliability_rating`) | **1.0 (A)** | OK |
| Rating seguridad (`security_rating`) | **1.0 (A)** | OK |
| Rating mantenibilidad (`sqale_rating`) | **1.0 (A)** | OK |
| Deuda técnica (missing effort) | 20 min | — |
| Complejidad / Funciones | 35 / 15 | — |

## 5. Detalle de issues (code smells)

| Severidad | Regla | Archivo |
| --- | --- | --- |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/Events/EventoDetalle/EventoDetalle.css` |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/products/ProductosDetalle/productsDetails.css` |
| MAJOR | `css:S4666` (x3) | `goblinhub_web/src/pages/register/register.css` |
| MINOR | `javascript:S1874` | `goblinhub-api/eslint.config.mjs` |

Los smells son de estilos CSS y una regla de deprecación en la config de ESLint; **ninguno**
en el código del PR escaneado.

## 6. Detalle de security hotspots

| Estado | Regla | Archivo | Nota |
| --- | --- | --- | --- |
| TO_REVIEW | `javascript:S2068` | `k6/scripts/as_prueba.js` | Falso positivo esperado: credencial falsa (bad path) del script de carga de otro integrante; no es una credencial real. |
| TO_REVIEW | `terraform:S6255` | `infra/terraform/main.tf` | Corresponde a IaC del integrante de infra. |
| TO_REVIEW | `terraform:S6281` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `terraform:S6249` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `docker:S6470` | `goblinhub_web/Dockerfile` | Corresponde al Dockerfile del frontend. |

Ninguno requiere mitigación inmediata para este PR (rutas de IaC/Docker de otros módulos y un
falso positivo del bad path ajeno).

## 7. Veredicto

- **Quality Gate: APROBADO (OK)**.
- Cero bugs, cero vulnerabilidades, cobertura **87.4%**, duplicación **0.3%**, ratings **A/A/A**.
- El código del PR #193 (`k6/scripts/aesr_prueba.js` — GET /productos) presenta **0 issues** en
  el análisis; el PR no introduce hallazgos de calidad ni asociados al scan.
- Dashboard: <http://localhost:9000/dashboard?id=goblinhub>

## 8. Evidencia adicional

- Captura del resumen del escaneo: `ANALYSIS SUCCESSFUL` / `EXECUTION SUCCESS` (182 archivos).
- Configuración reproducible en [`sonarqube/README.md`](./README.md) (stack local sin Docker,
  incluye pasos de instalación útiles para la issue de instalación #184).