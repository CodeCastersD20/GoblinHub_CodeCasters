# Feature Specification: Casos de prueba E2E (sección 3 de la Actividad 1.1)

**Feature Branch**: `feat/164-specs-spec-kit-para-modulos-piloto`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "/speckit.specify Catálogo de casos de prueba E2E de la sección 3: vistas públicas y navegación, interacción/formularios y control de acceso por roles."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vistas públicas y navegación (Priority: P1)

Como visitante, las vistas públicas (inicio, inventario y cartelera) renderizan contenido real del negocio.

**Why this priority**: Son los escenarios de mayor exposición; `home.spec.ts` valida el core del README.

**Independent Test**: Ejecutar `home.spec.ts` de forma aislada; cada caso es autocontenido.

**Acceptance Scenarios**:

1. **Given** la app levantada, **When** se abre `/`, **Then** se renderiza el hero, la próxima actividad y la ubicación con mapa.
2. **Given** el catálogo, **When** se navega a `/productos`, **Then** el inventario muestra tarjetas con categorías.
3. **Given** la cartelera, **When** se navega a `/eventos`, **Then** se muestran los eventos con fecha/lugar/cupo.

---

### User Story 2 - Interacción y formularios (Priority: P2)

Como usuario, el formulario de Contáctanos valida entradas y maneja estados de error y éxito.

**Why this priority**: Valida el contrato visual de formularios, complementando las pruebas unitarias.

**Independent Test**: Ejecutar `contacto.spec.ts`; los casos cubren happy y bad path.

**Acceptance Scenarios**:

1. **Given** campos incompletos, **When** se envía, **Then** se muestran errores.
2. **Given** datos válidos, **When** se envía, **Then** el flujo termina con éxito.

---

### User Story 3 - Control de acceso basado en roles (Priority: P3)

Como agente externo (anónimo o cliente), el cliente rechaza el acceso a `/admin/*`.

**Why this priority**: Prueba la barrera de seguridad perimetral en el navegador, no solo en la API.

**Independent Test**: Ejecutar `rbac-admin.spec.ts` con sesión anónima y con cliente.

**Acceptance Scenarios**:

1. **Given** usuario anónimo, **When** abre `/admin`, **Then** es redirigido al login.
2. **Given** usuario con rol cliente, **When** abre una ruta `/admin/*`, **Then** es redirigido y no ve datos administrativos.

---

### User Story 4 - Bad path del login (Priority: P1/P3)

Como usuario, un intento de inicio de sesión con credenciales inválidas muestra error sin romper el flujo.

**Why this priority**: Es el caso de seguridad de autenticación exigido en la issue #158 (módulo test de Adrian).

**Independent Test**: Ejecutar `login-bad-path.spec.ts`.

**Acceptance Scenarios**:

1. **Given** credenciales inválidas, **When** se intenta iniciar sesión, **Then** se muestra el mensaje de error.
2. **Given** un error de validación de red, **When** se envía el formulario, **Then** se informa sin estado inconsistente.

### Edge Cases

- Selectores ausentes en vistas dinámicas → localizadores auto-waiting de Playwright.
- Cargas de componentes con efectos de animación (CSS) → esperas de localizadores.
- Datos externos (API/Supabase) → los tests de vista pública se mantienen autocontenidos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Los casos DEBEN estar codificados en `goblinhub_web/e2e/*.spec.ts`.
- **FR-002**: Cada caso DEBE mapear a un escenario "Given/When/Then" documentado en la sección 3 del documento oficial.
- **FR-003**: La suite DEBE ejecutarse con `npm run test:e2e` sobre Chromium.
- **FR-004**: Los casos DEBEN cubrir vistas públicas, formularios, RBAC y bad path del login.

### Key Entities

- **Playwright tests**: `home`, `contacto`, `rbac-admin`, `login-bad-path`.
- **Drivers**: Chromium (proyecto en `playwright.config.ts`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 19 casos E2E aprobados (resultado real de la suite).
- **SC-002**: Cadencia en CI vinculada al build (`needs: build`) en `web.yml`.
- **SC-003**: Reporte HTML subido como artefacto (`playwright-report/`).

## Assumptions

- La infraestructura de tests ya está inicializada (issue #83/`test/83-pruebas-e2e`).
- El entorno CI provee las variables `VITE_*` necesarias.