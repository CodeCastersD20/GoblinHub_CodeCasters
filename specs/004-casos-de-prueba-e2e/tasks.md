# Tasks: Casos de prueba E2E (sección 3)

**Input**: Design documents from `/specs/004-casos-de-prueba-e2e/`

## Phase 1: Setup (infraestructura previa)

- [x] T001 Inicializar la infraestructura de tests E2E (issue #83, rama `test/83-pruebas-e2e`)
- [x] T002 Configurar `playwright.config.ts` (project chromium, webServer Vite)

---

## Phase 2: Casos de vistas públicas (P1)

- [x] T003 [US1] Codificar `home.spec.ts` (render inicio, productos y eventos)
- [x] T004 [US1] Ejecutar y validar

**Checkpoint**: US1 lista.

---

## Phase 3: Casos de formularios (P2)

- [x] T005 [US2] Codificar `contacto.spec.ts` (validación, errores, éxito)
- [x] T006 [US2] Ejecutar y validar

**Checkpoint**: US1 + US2 listas.

---

## Phase 4: Casos de RBAC y bad path login (P3)

- [x] T007 [US3] Codificar `rbac-admin.spec.ts` (redirección de anónimos y clientes)
- [x] T008 [US4] Codificar `login-bad-path.spec.ts` (credenciales inválidas) — PR #159
- [x] T009 [US3/US4] Ejecutar suite completa → 19 escenarios aprobados

**Checkpoint**: 19/19 en verde.

---

## Phase 5: Documentación y CI

- [x] T010 [P] Integrar job "E2E Tests (Playwright)" en `.github/workflows/web.yml` (needs: build)
- [x] T011 [P] Documentar tabla de casos en la sección 3 del documento de planeación
- [x] T012 [P] Adjuntar evidencia (reporte HTML / conteo de escenarios) en el entregable

**Checkpoint**: Casos de prueba documentados y en CI.