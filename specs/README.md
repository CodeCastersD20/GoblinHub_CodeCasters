# Specs — Módulos piloto (Spec Driven Development)

> Contiene los artefactos generados con **Spec Kit** para la Actividad 1.1.
> Los specs describen **qué** construir; el plan/tech detalla **cómo** y las tareas miden el avance.

## Comandos SDD ejecutados

Los artefactos de esta carpeta se generan y mantienen con los comandos de Spec Kit
(integración `opencode`, CLI `specify` v1.0.6). Comandos usados:

```bash
# 1. Crear/actualizar el spec de una feature (requisitos + user stories)  → specs/NNN-*/spec.md
/speckit.specify <descripción de la feature>

# (Opcional) Aclarar requisitos ambiguos
/speckit.clarify

# 2. Crear el plan técnico con el stack del proyecto                    → specs/NNN-*/plan.md
/speckit.plan <descripción de la feature>

# 3. Generar la lista de tareas accionables                              → specs/NNN-*/tasks.md
/speckit.tasks <descripción de la feature>

# 4. Ejecutar las tareas para implementar la feature
/speckit.implement <descripción de la feature>

# 5. Comparar el código contra spec/plan/tareas                          → reporte con/convergencia
/speckit.converge
```

Alternativa automatizada (workflow oficial de Spec Kit en este repo):

```text
.specify/workflows/speckit/workflow.yml  →  specify → [gate] → plan → [gate] → tasks → implement
```

## Artefactos por módulo piloto

| Módulo piloto | Carpeta | Spec | Plan | Tasks |
|---|---|---|---|---|
| **a)** Pruebas automatizadas E2E (Playwright) | `specs/001-pruebas-automatizadas-e2e-playwright/` | `spec.md` | `plan.md` | `tasks.md` |
| **b)** Tour guiado interactivo (driver.js) | `specs/002-tour-guiado-interactivo-driverjs/` | `spec.md` | `plan.md` | `tasks.md` |
| **c)** Infraestructura como código (Codespaces + Terraform) | `specs/003-infraestructura-codigo-codespaces-terraform/` | `spec.md` | `plan.md` | `tasks.md` |
| **3)** Casos de prueba E2E (sección 3) | `specs/004-casos-de-prueba-e2e/` | `spec.md` | `plan.md` | `tasks.md` |

## Flujo por módulo ejecutado

1. `feat/164-specs-spec-kit-para-modulos-piloto` (issue #164): specs de a), b), 3) y
   reference del piloto c). PR mínimo que "arroja los skills y specs" para nuevos módulos.
2. `infra/165-codespaces-terraform-iac` (issue #165): implementación del piloto c)
   (`/speckit.implement` sobre `specs/003-*`).
3. `docs/166-sdd-formal` (issue #166): documentación SDD formal.
4. `docs/167-planeacion-integrante` (issue #167): PRs de planeación por integrante.
5. `feat/168-playwright-mcp-ia-skill` (issue #168): módulo AU (extra).

## Verificación

- `/specs/*` valida que cada módulo tenga criterios de aceptación medibles.
- La ejecución de las tareas se valida con los pipelines `api.yml`/`web.yml`
  (lint, `tsc --noEmit`, build, tests, E2E) antes de mergar a `develop`.