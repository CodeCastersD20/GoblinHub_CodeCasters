# Implementation Plan: Casos de prueba E2E (sección 3)

**Branch**: `feat/164-specs-spec-kit-para-modulos-piloto` | **Date**: 2026-09-15 | **Spec**: `specs/004-casos-de-prueba-e2e/spec.md`

**Input**: Feature specification from `/specs/004-casos-de-prueba-e2e/spec.md`

## Summary

Documentar y ejecutar los casos de prueba de punta a punto de la sección 3 usando Playwright (alternativa moderna a Selenium/Katalon): vistas públicas, formularios, RBAC y bad path del login. Suite real: 19 escenarios en verde.

## Technical Context

**Language/Version**: TypeScript (Node 20)

**Primary Dependencies**: `@playwright/test`, Vite dev server

**Storage**: N/A

**Testing**: Playwright Test Runner, reporter HTML, project chromium

**Target Platform**: Chromium (headless en CI)

**Project Type**: E2E testing

**Performance Goals**: suite estable (< 5 min en CI, workers=1)

**Constraints**: `forbidOnly` en CI, retries=2 en CI, `use.trace: on-first-retry`

**Scale/Scope**: 19 escenarios / 4 archivos spec

## Constitution Check

- **Principio V (End-to-End Integration)**: aplica directo; suite E2E en CI como barrera.
- **Principio I (Test-First)**: los casos de prueba son la especificación ejecutable de la UI.
- Sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/004-casos-de-prueba-e2e/
├── spec.md      # /speckit.specify output
├── plan.md      # /speckit.plan output
└── tasks.md     # /speckit.tasks output
```

### Source Code (repository root)

```text
goblinhub_web/
├── e2e/
│   ├── home.spec.ts
│   ├── contacto.spec.ts
│   ├── rbac-admin.spec.ts
│   └── login-bad-path.spec.ts
├── playwright.config.ts
└── package.json
```

**Structure Decision**: Playwright en `goblinhub_web/e2e/`, un spec por responsabilidad.

## Complexity Tracking

No hay violaciones de complejidad que justificar.