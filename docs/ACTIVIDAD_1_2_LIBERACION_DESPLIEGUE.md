# Actividad 1.2 — Liberación y despliegue continuo de GoblinHub

> **Caso de estudio:** GoblinHub — plataforma web de gestión de una tienda y
> comunidad de videojuegos.
> **Repositorio:** <https://github.com/CodeCastersD20/GoblinHub_CodeCasters>
>
> Documento maestro de la Actividad 1.2 (borrador inicial, completado por el
> equipo a partir de las issues #177–#188).

---

## 1. Justificación del flujo de trabajo (pipeline) para la liberación y el despliegue continuo

*Sección a completar.* Justificar por qué GoblinHub adopta un pipeline de
**liberación** (Continuous Delivery) y **despliegue continuo** (Continuous
Deployment):

- Reducir el tiempo de puesta en producción y el riesgo humano (despliegues
  repetibles y automatizados).
- Garantizar que todo cambio aprobado en `develop` pase por un entorno de
  **liberación** donde se ejecutan las pruebas antes del despliegue.
- Evidenciar trazabilidad release → entorno → pruebas → despliegue.

**Responsables:** equipo (orquestación en issue #178).

## 2. Entorno requerido para la liberación y el despliegue continuo

*Sección a completar.* Entorno necesario:

| Componente | Herramienta | Propósito |
|---|---|---|
| Control de versiones | Git + GitHub | Ramas `main`/`develop`, revisión de PRs |
| Integración continua | GitHub Actions (`api.yml`, `web.yml`, `playwright.yml`) | Lint, type-check, tests, build |
| Liberación continua | GitHub Actions (nuevo workflow de release, issue #178) | Generar release y entorno de liberación |
| Contenedores | Docker (Dockerfile multi-stage) + `devcontainer` / Codespaces | Entorno reproducible |
| Hosting / entorno de despliegue | Render (blue/green o instancia de staging) | Despliegue continuo |
| Pruebas de carga | K6 (issue #179) | SLA p95 < 5 s |
| Análisis estático | SonarQube local (issue #184) | Calidad de código |

## 3. Niveles de servicio acordados (SLA)

*Sección a completar.* Los **scripts para la generación del entorno de
liberación**, **scripts de pruebas** y **scripts de despliegue** (issue #178)
deben operar dentro de los siguientes niveles de servicio:

- **Disponibilidad del pipeline:** el pipeline de CD no debe permitir un
  despliegue con pruebas fallidas.
- **Tiempo de respuesta de la aplicación (carga):** objetivo **p95 < 5 s** en
  los endpoints más usados, validado con **K6** (issues #180–#183).
- **Calidad de código:** sin *bugs* ni *vulnerabilidades* nuevas bloqueantes en
  el análisis **SonarQube** (issues #185–#188).
- **Rollback:** el entorno de despliegue debe permitir volver a la versión
  anterior automáticamente si falla el *healthcheck*.

## 4. Métricas para el monitoreo de la aplicación

*Sección a completar.* Métricas mínimas a recolectar y reportar:

| Métrica | Fuente | Umbral acordado |
|---|---|---|
| `http_req_duration` y **p95** | K6 (`k6/scripts/*_prueba.js`) | p95 < 5 s |
| `http_reqs` (rendimiento), VUs activos | K6 | registro por integrante |
| Errores HTTP (5xx/4xx) | K6 checks / logs JSON del backend | 0 errores en pico |
| Bugs, vulnerabilidades, code smells | SonarQube | Quality Gate |
| Estado del build/test | GitHub Actions | 100 % verde en `develop` |
| Healthcheck `/health` | Docker `HEALTHCHECK` + Render | ready en < 30 s |

Resultados por integrante: `k6/RESULTADOS_*.md` y `sonarqube/RESULTADOS_*.md`.

## 5. Parámetros de configuración de las herramientas utilizadas

*Sección a completar.* Incluye: variables de entorno (`.env`, Render, Supabase,
Redis), configuración de GitHub Actions, `playwright.config.ts`,
`docker-compose`/Devcontainer, `sonar-project.properties` y versiones de
Node/Python/herramientas. Basado en la Sección 1 de la **Actividad 1.1**.

## 6. Herramienta de liberación continua vinculada con el entorno de despliegue

*Issue #178 (responsable: @Ddarielz).* Vincular GitHub Actions como herramienta
de **liberación continua** con el entorno de despliegue (Render). Entregables
en el repo:

- `scripts/` con el flujo de trabajo (pipeline):
  - `scripts/release/` — **generación del entorno de liberación**.
  - `scripts/test/` — **ejecución de pruebas en el entorno de liberación**.
  - `scripts/deploy/` — **generación del despliegue**.
- Workflow de GitHub Actions que orqueste: build → entorno de liberación →
  pruebas → despliegue → healthcheck.

## 7. Pruebas de carga con K6 (métricas y SLA p95 < 5 s)

Plan y ejecuciones basadas en las issues:

| # | Tarea | Responsable | Artículo |
|---|---|---|---|
| #179 | Plan de pruebas de carga K6 (instalación + endpoints) | @AdrianS-127 | `k6/PLAN_K6.md` |
| #180 | Ejecución K6 — GET `/productos` | @Sadrach34 | `k6/scripts/sj_prueba.js` + `k6/RESULTADOS_SADRACH.md` |
| #181 | Ejecución K6 — GET `/eventos` | @Ddarielz | `k6/scripts/ed_prueba.js` + `k6/RESULTADOS_ERICK.md` |
| #182 | Ejecución K6 — GET `/` | @Alfion72 | `k6/scripts/am_prueba.js` + `k6/RESULTADOS_ADRIANA.md` |
| #183 | Ejecución K6 — POST `/api/auth/login` | @AdrianS-127 | `k6/scripts/as_prueba.js` + `k6/RESULTADOS_ADRIAN.md` |

Cada ejecución usa un **script con nomenclatura `iniciales_prueba.js`**, **>
5 Virtual Users**, **mínimo 1 endpoint**, y reporta la mayor cantidad de
métricas (p95, `http_req_duration`, `http_reqs`, checks). Opcional: integración
en CI/CD (husky pre-commit o GitHub Actions) y screenshot por integrante.

## 8. Análisis de código estático con SonarQube

| # | Tarea | Responsable | Artículo |
|---|---|---|---|
| #184 | Instalación de SonarQube en stack local (PR de implementación) | @Alfion72 | `sonarqube/` (docker-compose + pasos + `sonar-project.properties`) |
| #185 | Escaneo del PR de la 1ª unidad | @Sadrach34 | `sonarqube/RESULTADOS_SADRACH.md` |
| #186 | Escaneo del PR de la 1ª unidad | @Ddarielz | `sonarqube/RESULTADOS_ERICK.md` |
| #187 | Escaneo del PR de la 1ª unidad | @Alfion72 | `sonarqube/RESULTADOS_ADRIANA.md` |
| #188 | Escaneo del PR de la 1ª unidad | @AdrianS-127 | `sonarqube/RESULTADOS_ADRIAN.md` |

Cada integrante ejecuta `sonar-scanner` contra el stack local sobre su PR de la
1ª unidad y evidencia bugs, vulnerabilidades, code smells, cobertura y
duplicados en markdown.

## 9. Reparto de tareas por integrante (issues)

| Integrante | GitHub | Issues |
|---|---|---|
| Sadrach Juan Diego Garcia Flores | @Sadrach34 | #177 (documento), #180 (K6), #185 (Sonar) |
| Erick Daniel Arvayo Aviles | @Ddarielz | #178 (pipeline), #181 (K6), #186 (Sonar) |
| Jesús Adriana Martínez Trillas | @Alfion72 | #182 (K6), #184 (Sonar install), #187 (Sonar) |
| Adrián Eduardo Santos Rosales | @AdrianS-127 | #179 (plan K6), #183 (K6), #188 (Sonar) |