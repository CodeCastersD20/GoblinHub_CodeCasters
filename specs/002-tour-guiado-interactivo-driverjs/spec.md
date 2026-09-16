# Feature Specification: Tour guiado interactivo (driver.js)

**Feature Branch**: `feat/164-specs-spec-kit-para-modulos-piloto`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "/speckit.specify Piloto b) guía interactiva de la plataforma con driver.js: tour de bienvenida automático en la primera visita, botón flotante para repetirlo y tours específicos por página."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tour automático de primera visita (Priority: P1)

Como visitante nuevo, al entrar por primera vez a la página de inicio se muestra un tour guiado que presenta las secciones clave.

**Why this priority**: Resuelve el onboarding de primer uso (problema documentado en la issue #160) sin intervención manual.

**Independent Test**: Al abrir `/` con el `localStorage` limpio (`gh_guided_tour_done` ausente), el tour arranca a los 600 ms y presenta los pasos de inicio.

**Acceptance Scenarios**:

1. **Given** `localStorage.gh_guided_tour_done` no existe, **When** el usuario abre `/`, **Then** el tour arranca automáticamente.
2. **Given** el tour finaliza (`onDestroyed`), **When** se cierra la última burbuja, **Then** se persiste `gh_guided_tour_done` y ya no se repite solo.

---

### User Story 2 - Botón flotante para repetir el tour (Priority: P2)

Como usuario, existe un botón flotante `?` para reiniciar el tour desde cualquier página.

**Why this priority**: Permite releer la guía cuando se olvida un flujo, sin depender de la primera visita.

**Independent Test**: Clic en `.guide-tour-launcher` dispara `startGuidedTour` con los pasos de la ruta actual.

**Acceptance Scenarios**:

1. **Given** una página válida, **When** el usuario hace clic en `?`, **Then** se inicia el tour correspondiente a esa ruta.
2. **Given** una ruta oculta (`/login`, `/register`, `/reset-password`, `/confirm-account`), **When** se renderiza la página, **Then** el componente no muestra el botón ni lanza tour.

---

### User Story 3 - Tours específicos por página (Priority: P3)

Como usuario en `/productos`, `/eventos` o `/`, el tour guiado destaca los elementos propios de cada sección.

**Why this priority**: La guía contextual es más útil que un tour genérico; cubre checkout visual de cada vista de negocio.

**Independent Test**: Navegar a `/eventos` y disparar el tour → pasos de `.ca-title`, `.ca-events` y `.ca-btn--inscribirse`.

**Acceptance Scenarios**:

1. **Given** la ruta `/productos`, **When** se inicia el tour, **Then** los pasos apuntan a `.products-title`, `.list-category` y `.products-grid`.
2. **Given** un selector ausente en la página, **When** el tour intenta avanzar, **Then** `skipMissingElement: true` omite el paso sin romper el tour.

### Edge Cases

- ¿Qué pasa si el selector no existe (contenido dinámico)? → `skipMissingElement: true`.
- ¿Y si el usuario ya vio el tour? → marca en `localStorage`.
- ¿Accesibilidad? → botón con `aria-label`.
- ¿Rutas de auth? → lista `TOUR_HIDDEN_PATHS` exime al componente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El frontend DEBE incluir la dependencia `driver.js` (`^1.8.0`).
- **FR-002**: Existe el componente `GuideTour` en `goblinhub_web/src/components/guideTour/`.
- **FR-003**: El tour DEBE arrancar automáticamente en la primera visita a `/` y guardar `gh_guided_tour_done`.
- **FR-004**: DEBE existir un botón flotante `.guide-tour-launcher` para reiniciar el tour.
- **FR-005**: DEBE haber tours específicos para inicio, productos y eventos con `skipMissingElement: true`.
- **FR-006**: `GuideTour` DEBE montarse en `App.tsx`.
- **FR-007**: El componente DEBE tener pruebas unitarias Vitest (renderizado, visibilidad y flujo de arranque).

### Key Entities

- **GuideTour**: componente React (driver.js v1.8.0).
- **STEPS**: diccionario de rutas → `DriveStep[]`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El tour se muestra una única vez por navegador al primer ingreso.
- **SC-002**: La suite Vitest del componente pasa (guidetour.test.tsx, 73 líneas incluidas).
- **SC-003**: El componente cumple lint y `tsc --noEmit` en CI.

## Assumptions

- `localStorage` está disponible (navegador).
- El tour no interfiere con los flujos de autenticación (rutas ocultas).
- driver.js 1.8.0 es compatible con React 19.