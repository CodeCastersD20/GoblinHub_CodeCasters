# Tasks: Pruebas automatizadas E2E (Playwright)

**Input**: Design documents from `/specs/001-pruebas-automatizadas-e2e-playwright/`

## Phase 1: Setup

- [x] T001 Instalar `@playwright/test` en `goblinhub_web/` (devDependency)
- [x] T002 Configurar `playwright.config.ts` (project chromium, webServer `npm run dev`, baseURL)
- [x] T003 Añadir script `test:e2e` en `goblinhub_web/package.json`

---

## Phase 2: User Story 1 - Vistas públicas (P1)

- [x] T004 [US1] Crear `e2e/home.spec.ts` (render hero/evento/mapa + navegación a productos/eventos)
- [x] T005 [US1] Ejecutar y validar los tests de home sobre Chromium

**Checkpoint**: Suite de vistas públicas funcionando.

---

## Phase 3: User Story 2 - Formulario de contacto (P2)

- [x] T006 [US2] Crear `e2e/contacto.spec.ts` (validación, estados de error, envío exitoso)
- [x] T007 [US2] Ejecutar y validar sobre Chromium

**Checkpoint**: US1 + US2 independientes y pasando.

---

## Phase 4: User Story 3 - RBAC admin (P3)

- [x] T008 [US3] Crear `e2e/rbac-admin.spec.ts` (no autenticado y cliente → redirigidos fuera de /admin/*)
- [x] T009 [US3] Crear `e2e/login-bad-path.spec.ts` (bad path del login)
- [x] T010 [US3] Ejecutar la suite completa (`npm run test:e2e`) → total esperado: 19 escenarios en verde

**Checkpoint**: Suite completa en verde.

---

## Phase 5: Integración CI/CD

- [x] T011 [P] Configurar el job "E2E Tests (Playwright)" en `.github/workflows/web.yml` (needs: build, `npx playwright install chromium --with-deps`, artefacto `playwright-report/`)
- [x] T012 [P] Documentar trazabilidad en la Actividad 1.1 (módulo a) — issues #106, #115, #83, #158 y PRs #107, #116, #153, #159

**Checkpoint**: E2E en CI + evidencia documentada.