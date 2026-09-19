# Resultados — Escaneo SonarQube (PR asignado)

**Issue:** [#185](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/185)
**PR escaneado:** [Pull Request #192](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/192) — Prueba de carga K6 (POST /auth/signin, bad path)
**Fecha de ejecución:** 2026-09-18
**Ejecutor:** Sadrach Juan Diego Garcia Flores (Sdrx)

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
  -Dproject.settings=sonarqube/sonar-project.properties
```

Resultado: `ANALYSIS SUCCESSFUL` (169 archivos analizados, análisis 11 s; cobertura procedente de `jest --coverage --coverageReporters=lcov`, 31 suites / 194 tests OK).

## 4. Métricas de calidad

| Métrica | Valor | Veredicto |
| --- | --- | --- |
| Quality Gate (`alert_status`) | **OK** | ✅ |
| Bugs | **0** | ✅ |
| Vulnerabilidades | **0** | ✅ |
| Security Hotspots | **5** (todos `TO_REVIEW`) | ⚠️ pendientes de revisión |
| Code Smells | **6** | ⚠️ menor |
| Cobertura (`coverage`) | **87.4%** | ✅ |
| Densidad de duplicados | **0.0%** | ✅ |
| Líneas de código (`ncloc`) | **5 074** | — |
| Rating fiabilidad (`reliability_rating`) | **1.0 (A)** | ✅ |
| Rating seguridad (`security_rating`) | **1.0 (A)** | ✅ |
| Rating mantenibilidad (`sqale_rating`) | **1.0 (A)** | ✅ |
| Deuda (missing effort) | 20 min | — |
| Complejidad / Funciones | 35 / 15 | — |

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
| TO_REVIEW | `javascript:S2068` | `k6/scripts/as_prueba.js` | **Falso positivo esperado**: es la credencial falsa (bad path) del script de carga; no es una credencial real. |
| TO_REVIEW | `terraform:S6255` | `infra/terraform/main.tf` | Corresponde a IaC del integrante de infra. |
| TO_REVIEW | `terraform:S6281` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `terraform:S6249` | `infra/terraform/main.tf` | Ídem IaC. |
| TO_REVIEW | `docker:S6470` | `goblinhub_web/Dockerfile` | Corresponde al Dockerfile del frontend. |

Ninguno requiere mitigación inmediata para este PR (rutas de IaC/Docker de otros módulos y un falso positivo del bad path).

## 7. Veredicto

- **Quality Gate: APROBADO (OK)**.
- Cero bugs, cero vulnerabilidades, cobertura **87.4%**, duplicación **0%**, ratings **A/A/A**.
- El código del PR #192 no introduce issues de calidad; el único hallazgo asociado al PR
  (`S2068` en `as_prueba.js`) es un falso positivo (credencial inválida a propósito).
- Dashboard: <http://localhost:9000/dashboard?id=goblinhub>

## 8. Evidencia adicional

- Captura del resumen del escaneo: `ANALYSIS SUCCESSFUL` / `EXECUTION SUCCESS`.
- Configuración reproducible en [`sonarqube/README.md`](./README.md) (incluye pasos de instalación del stack local, útiles para la issue de instalación #184).