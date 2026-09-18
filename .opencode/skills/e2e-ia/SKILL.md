---
name: e2e-ia
description: Genera y ejecuta pruebas E2E con Playwright usando MCP y un agente de IA. Usa cuando quieras convertir una spec (spec-kit) o un requerimiento en un test E2E que pase, añadir casos de prueba, o ejecutar la suite completa. Módulo AU de la Actividad 1.1 (Playwright + MCP + IA).
---

# E2E con Playwright + MCP + IA

Convierte una spec (Spec Kit) o un requerimiento en una prueba E2E **ejecutable y
que pase**, y corre la suite para verificarla. Es el módulo adicional (AU) de la
Actividad 1.1, aparte de a) b) c).

## Cuándo usarlo

- El usuario tiene un `spec.md` (de `specs/`) y quiere el caso E2E correspondiente.
- Hay un requerimiento nuevo ("cuando X ocurre, el usuario ve Y") y falta el test.
- Se pidió ejecutar/verificar la suite (`npm run test:e2e`).

## Requisitos

- Proyecto frontend con Playwright ya configurado: `goblinhub_web/playwright.config.ts`.
- MCP server `playwright-mcp` registrado en `opencode.json` (tipo local,
  `npx -y @playwright/mcp@latest`).
- Comando de la suite: `npm run test:e2e` en `goblinhub_web/`.

## Flujo

1. **Leer la spec o el requerimiento**: si hay un `specs/<carpeta>/spec.md`,
   extrae las *User Stories* y los *Acceptance Scenarios* (Given/When/Then).
2. **Planear el archivo spec**: cada archivo `.spec.ts` en `e2e/` debe tener
   responsabilidad única (una vista o un flujo). Nombra `kebab-case.spec.ts`.
3. **Escribir el test** siguiendo estas reglas:
   - Usa `test.describe` por usuario funcional y `test("...", async ({ page }) => ...)`.
   - Prefiere **localizadores accesibles**: `getByRole`, `getByLabel`, `getByText`.
   - Para visitar páginas usa la URL base del server (normalmente `http://localhost:5173`).
   - Si el paso depende de estado previo (`localStorage`), configúralo en el test
     (`page.addInitScript` o `page.evaluate`).
   - Evita sleeps; usa `expect(...).toBeVisible()` con auto-waiting de Playwright.
4. **Ejecutar SOLO el archivo nuevo** para validar rápido:
   ```bash
   npx playwright test e2e/<archivo>.spec.ts --project=chromium
   ```
5. **Correr la suite completa** (si se pide evidencia):
   ```bash
   npm run test:e2e
   ```
6. **Iterar hasta verde** si un localizador cambió: ajusta el selector al DOM real
   (inspecciona con la herramienta del navegador MCP si está disponible).

## Reglas del repo

- Ciclo **Test-First** (Constitución): el test especifica el comportamiento; si
  una funcionalidad no existe aún, el test queda como spec y se marca el flujo.
- No romper tests existentes: `npm run test:e2e` debe seguir pasando completo.
- Convention: Conventional Commits con scope, p. ej. `test(e2e): ...`.

## Verificación

- El archivo nuevo pasa aislado sobre Chromium.
- La suite completa (19 escenarios + los nuevos) queda en verde.
- Si se genera desde una spec, registrar la trazabilidad (issue/PR) al terminar.