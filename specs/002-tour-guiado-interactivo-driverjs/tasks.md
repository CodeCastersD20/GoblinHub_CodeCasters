# Tasks: Tour guiado interactivo (driver.js)

**Input**: Design documents from `/specs/002-tour-guiado-interactivo-driverjs/`

## Phase 1: Setup

- [x] T001 Instalar `driver.js@^1.8.0` en `goblinhub_web/` (PR #161, issue #160)

---

## Phase 2: User Story 1 - Tour automático de primera visita (P1)

- [x] T002 [US1] Crear `ACTUALIZACION` componente `GuideTour` en `src/components/guideTour/guideTour.tsx`
- [x] T003 [US1] Definir `CONFIG` (showProgress, overlayColor, skipMissingElement, textos en español)
- [x] T004 [US1] Auto-arranque condicionado a `!localStorage.getItem("gh_guided_tour_done")` y ruta `/`
- [x] T005 [US1] Persistir `gh_guided_tour_done` con `onDestroyed`

**Checkpoint**: Tour automático en primera visita funcionando.

---

## Phase 3: User Story 2 - Botón flotante (P2)

- [x] T006 [US2] Botón `.guide-tour-launcher` (`?`) con `aria-label` para reiniciar el tour
- [x] T007 [US2] Ocultar componente en `TOUR_HIDDEN_PATHS` (/login, /register, /reset-password, /confirm-account)

**Checkpoint**: US1 + US2 funcionando.

---

## Phase 4: User Story 3 - Tours por página (P3)

- [x] T008 [US3] Diccionario `STEPS` con tours para inicio, productos y eventos
- [x] T009 [US3] Selectores ausentes con `skipMissingElement: true` (p. ej. `.ca-btn--inscribirse`)
- [x] T010 [US3] Estilos del popover y botón en `guideTour.css`

**Checkpoint**: Tours contextuales completos.

---

## Phase 5: Calidad y CI

- [x] T011 [P] Test unitario `guideTour.test.tsx` (renderizado, visibilidad en rutas ocultas, flujo de arranque)
- [x] T012 [P] Montar `<GuideTour/>` en `App.tsx`
- [x] T013 [P] Pasar lint + `tsc --noEmit` + Vitest en CI (PR #161)

**Checkpoint**: Feature completada y verificada por CI.