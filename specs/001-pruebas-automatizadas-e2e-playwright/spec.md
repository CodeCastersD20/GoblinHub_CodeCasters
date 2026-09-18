# Feature Specification: Pruebas automatizadas E2E (Playwright)

**Feature Branch**: `feat/164-specs-spec-kit-para-modulos-piloto`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "/speckit.specify Piloto a) pruebas automatizadas E2E con Playwright para la vista pública, formularios y RBAC del panel administrativo de GoblinHub"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suite E2E de vistas públicas (Priority: P1)

Como visitante, el sistema renderiza la página de inicio, el catálogo de inventario y la cartelera de eventos sin errores.

**Why this priority**: Es el flujo de mayor exposición pública del negocio (README: tienda + comunidad). Valida el renderizado base y el contrato visual ante cualquier regresión.

**Independent Test**: Se prueba con `npx playwright test e2e/home.spec.ts` y es un MVP de la suite: valida la UI de inicio completa.

**Acceptance Scenarios**:

1. **Given** que el frontend está servido en `http://localhost:5173`, **When** el visitante abre `/`, **Then** la página de inicio renderiza el hero, el próximo evento y el mapa de la tienda.
2. **Given** el catálogo público, **When** el visitante navega a `/productos`, **Then** se muestra la lista de productos con las categorías.
3. **Given** el calendario de la guarida, **When** el visitante navega a `/eventos`, **Then** se muestran las tarjetas de eventos con fecha, lugar y cupo.

---

### User Story 2 - Validación del formulario de contacto (Priority: P2)

Como usuario, el formulario de Contáctanos valida los campos e informa estados de error y de éxito.

**Why this priority**: Protege la calidad de los datos que llegan a la tienda y cubre el "mal camino" (bad path) que los tests unitarios no ven.

**Independent Test**: `npx playwright test e2e/contacto.spec.ts`.

**Acceptance Scenarios**:

1. **Given** campos incompletos, **When** el usuario envía el formulario, **Then** se muestran mensajes de error y no se envía.
2. **Given** campos válidos, **When** el usuario envía, **Then** el flujo termina en estado de éxito.

---

### User Story 3 - Barreras RBAC del panel administrativo (Priority: P3)

Como visitante o cliente autenticado, el sistema redirige fuera de las rutas `/admin/*`.

**Why this priority**: Es la barrera de seguridad perimetral del cliente; verificarla E2E demuestra que el RBAC se aplica en navegador, no solo en API.

**Independent Test**: `npx playwright test e2e/rbac-admin.spec.ts`.

**Acceptance Scenarios**:

1. **Given** un usuario no autenticado, **When** intenta abrir `/admin`, **Then** es redirigido al login.
2. **Given** un cliente (rol jugador), **When** intenta abrir `/admin/*`, **Then** es redirigido y no ve contenido administrativo.

### Edge Cases

- ¿Qué pasa cuando los selectores de la página aún no existen (animación/carga)? → los tests usan localizadores auto-waiting de Playwright.
- ¿Cómo se comporta el webServer en CI? → `reuseExistingServer: !process.env.CI` levanta `npm run dev` solo una vez.
- ¿Qué pasa si un test depende de datos remotos (API/Supabase)? → los tests de vista pública mockean/ignoran dependencias externas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ejecutar la suite E2E sobre Chromium (`npx playwright install chromium`).
- **FR-002**: Los tests DEBEN vivir en `goblinhub_web/e2e/*.spec.ts`.
- **FR-003**: El comando `npm run test:e2e` DEBE lanzar el webServer de desarrollo y los tests.
- **FR-004**: El pipeline `web.yml` DEBE correr el job "E2E Tests (Playwright)" **dependiendo** del build (needs: build).
- **FR-005**: El reporte HTML (`playwright-report/`) DEBE subirse como artefacto en CI.
- **FR-006**: Los tests DEBEN cubrir vistas públicas, validación de formularios y RBAC.

### Key Entities

- **E2E specs**: archivos `home.spec.ts`, `contacto.spec.ts`, `rbac-admin.spec.ts`, `login-bad-path.spec.ts`.
- **WebServer**: `npm run dev` (Vite) en `http://localhost:5173`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 19 escenarios E2E ejecutados y aprobados sobre Chromium.
- **SC-002**: Cero tests flaky en ejecución de CI (retries solo en CI: 2).
- **SC-003**: Cada PR que modifica `goblinhub_web/**` pasa el job E2E antes del merge.

## Assumptions

- El dev server de Vite es suficiente para servir la app en los tests.
- Las ligas de la API se resuelven vía variables de entorno `VITE_*` (provistas en CI).
- El reporte HTML es consumible como evidencia en la Actividad 1.1.