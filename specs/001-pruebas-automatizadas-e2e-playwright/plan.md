# Implementation Plan: Pruebas automatizadas E2E (Playwright)

**Branch**: `feat/164-specs-spec-kit-para-modulos-piloto` | **Date**: 2026-09-15 | **Spec**: `specs/001-pruebas-automatizadas-e2e-playwright/spec.md`

**Input**: Feature specification from `/specs/001-pruebas-automatizadas-e2e-playwright/spec.md`

## Summary

Ejecutar y documentar la suite E2E de GoblinHub con Playwright sobre Chromium: vistas públicas (home, productos, eventos), validación de formularios (contacto) y barreras RBAC (`/admin/*`), integrada al job "E2E Tests (Playwright)" de `web.yml`.

## Technical Context

**Language/Version**: TypeScript (Node 20)

**Primary Dependencies**: `@playwright/test`

**Storage**: N/A (los tests no persisten datos)

**Testing**: Playwright Test Runner (`npm run test:e2e`), reporter HTML + trace on first retry

**Target Platform**: Chromium (local y CI headless)

**Project Type**: web-app E2E testing

**Performance Goals**: suite < 5 min en CI; workers limitados en CI (1) para estabilidad

**Constraints**: CI `forbidOnly`; retries 2 en CI; `reuseExistingServer: !process.env.CI`

**Scale/Scope**: 19 escenarios E2E en 4 archivos spec

## Constitution Check

- **Principio V (End-to-End Verification)**: la suite valida contractos UI completos entre React y API; pasa el gate.
- **Principio I (Test-First)**: los escenarios E2E describen comportamiento antes del feature; alineado.
- Sin violaciones de complejidad: cada módulo tiene su archivo spec con responsabilidad única.

## Project Structure

### Documentation (this feature)

```text
specs/001-pruebas-automatizadas-e2e-playwright/
├── spec.md        # /speckit.specify output
├── plan.md        # /speckit.plan output
└── tasks.md       # /speckit.tasks output
```

### Source Code (repository root)

```text
goblinhub_web/
├── e2e/
│   ├── home.spec.ts             # vistas públicas y navegación
│   ├── contacto.spec.ts         # formularios: error y éxito
│   ├── rbac-admin.spec.ts       # barreras de seguridad /admin/*
│   └── login-bad-path.spec.ts   # bad path del login
├── playwright.config.ts         # webServer + project chromium
└── package.json                 # script "test:e2e"
```

**Structure Decision**: Playwright centralizado en `goblinhub_web/`, con un archivo spec por responsabilidad funcional/seguridad (coincide con el esquema actual del repo).

## Complexity Tracking

No hay violaciones de complejidad que justificar.