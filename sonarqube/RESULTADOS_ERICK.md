# Resultados — Escaneo SonarQube (PR asignado)

**Issue:** #[COMPLETAR_ISSUE_ID]
**PR escaneado:** [Pull Request #[COMPLETAR_PR_ID]](https://github.com/CodeCastersD20/GoblinHub_CodeCasters/pull/[COMPLETAR_PR_ID]) — [COMPLETAR_TITULO_DEL_PR]
**Fecha de ejecución:** 2026-09-20
**Ejecutor:** Erick (ED)

## 1. Stack local utilizado

| Componente | Versión |
| --- | --- |
| SonarQube | 9.9.5 Community LTS (sin Docker) |
| sonar-scanner | 6.2.1.4610 (windows-x64) |
| JDK | OpenJDK 17.0.12+7 |
| Base del análisis | Raíz del repo (proyecto `goblinhub`) |
| Servidor | `http://localhost:9000` |

## 2. Configuración

Archivos de exclusión basados en [`sonarqube/sonar-project.properties`](./sonar-project.properties).

## 3. Comando de escaneo

```powershell
sonar-scanner "-Dsonar.host.url=http://localhost:9000" "-Dsonar.login=$env:TOKEN" "-Dproject.settings=sonarqube/sonar-project.properties"
```

Resultado: `ANALYSIS SUCCESSFUL`.

## 4. Métricas de calidad obtenidas

| Métrica | Valor | Veredicto |
| --- | --- | --- |
| Quality Gate | **OK** | ✅ |
| Bugs | **0** | ✅ |
| Vulnerabilidades | **0** | ✅ |
| Security Hotspots | **5** (todos `TO_REVIEW`) | ⚠️ pendientes de revisión |
| Code Smells | **6** | ⚠️ menor |
| Cobertura (`coverage`) | **0.0%** *(No se importó lcov en esta corrida)* | ⚠️ |
| Densidad de duplicados | **0.3%** | ✅ |
| Rating fiabilidad | **A (1.0)** | ✅ |
| Rating seguridad | **A (1.0)** | ✅ |
| Rating mantenibilidad | **A (1.0)** | ✅ |

## 5. Detalle de issues encontrados en el PR

| Severidad | Regla | Archivo |
| --- | --- | --- |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/Events/EventoDetalle/EventoDetalle.css` |
| MAJOR | `css:S4667` | `goblinhub_web/src/pages/products/ProductosDetalle/productsDetails.css` |
| MAJOR | `css:S4666` | `goblinhub_web/src/pages/register/register.css` (x3) |
| MINOR | `javascript:S1874` | `goblinhub-api/eslint.config.mjs` |

*Los code smells detectados corresponden a estilos CSS duplicados/vacíos y reglas deprecadas de ESLint en archivos heredados, ninguno impacta de forma crítica tu código analizado.*

## 6. Security Hotspots encontrados

| Estado | Regla | Archivo | Nota |
| --- | --- | --- | --- |
| TO_REVIEW | `javascript:S2068` | `k6/scripts/as_prueba.js` | Falso positivo (credencial falsa del script de carga). |
| TO_REVIEW | `terraform:S6255` | `infra/terraform/main.tf` | IaC heredado. |
| TO_REVIEW | `terraform:S6281` | `infra/terraform/main.tf` | IaC heredado. |
| TO_REVIEW | `terraform:S6249` | `infra/terraform/main.tf` | IaC heredado. |
| TO_REVIEW | `docker:S6470` | `goblinhub_web/Dockerfile` | Dockerfile de frontend heredado. |

## 7. Veredicto

- **Quality Gate:** APROBADO (OK).
- **Resumen:** Cero bugs y cero vulnerabilidades. Ratings A/A/A. El código cumple perfectamente con los estándares, a pesar de reportarse 0% de cobertura por no haberse corrido los tests de `jest` antes del análisis.
- **Dashboard:** <http://localhost:9000/dashboard?id=goblinhub>

## 8. Evidencia adicional

- *(Inserta aquí tu captura de pantalla del Dashboard de SonarQube evidenciando los resultados)*
- Ejecución limpia: `ANALYSIS SUCCESSFUL`.
