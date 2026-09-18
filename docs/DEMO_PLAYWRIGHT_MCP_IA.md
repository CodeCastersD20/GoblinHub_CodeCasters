# Demostración — Módulo AU: Playwright + MCP + IA

> **Módulo adicional** de la Actividad 1.1 (calificación AU).
> Combine **Playwright** (framework E2E), **MCP** (`@playwright/mcp` como server
> Model Context Protocol) e **IA** (skill `e2e-ia` de opencode que genera y
> ejecuta las pruebas reconvirtiendo una spec en casos E2E verificables).

## Componentes del módulo

| Componente | Archivo | Descripción |
|---|---|---|
| MCP server | `opencode.json` (`mcp.playwright-mcp`) | Expone el navegador (Chromium) como herramientas MCP: `npx -y @playwright/mcp@latest` |
| Skill de IA | `.opencode/skills/e2e-ia/SKILL.md` | Prompt que convierte un `spec.md` de Spec Kit en `*.spec.ts` y lo ejecuta |
| Suite E2E | `goblinhub_web/` (Playwright) | Cartgets `playwright.config.ts`, `webServer` = `npm run dev` (Vite) |
| Más evidencia | `e2e/tour-guiado.spec.ts` | Test generado por el flujo `e2e-ia` desde la espec 002 (tour driver.js) |

## Flujo ejecutado (Test-First / Spec Kit)

1. **Especificación**: `specs/002-tour-guiado-interactivo-driverjs/spec.md`
   (user story: un primer visitante a `/` puede descubrir la plataforma mediante
   un tour guiado; el tour no debe aparecer en rutas de autenticación).
2. **Generación (IA)**: el skill `e2e-ia` escribió `e2e/tour-guiado.spec.ts`
   (2 escenarios Given/When/Then).
3. **Validación aislada**:
   ```bash
   npx playwright test e2e/tour-guiado.spec.ts --project=chromium
   # → 2 passed (2.9s)
   ```
4. **Regresión**: la suite completa reveló un conflicto real con el tour
   automático: el popover del tour *también* contiene el texto *GoblinHub*, y
   `getByText("GoblinHub")` (strict mode) resolvía 2 elementos. Se corrigió
   `home.spec.ts:15` con `{ exact: true }` (la spec exigía *el nombre de la
   marca*, no el título del popover).

## Evidencia del resultado final

```text
$ npm run test:e2e
[24/25] [chromium] › e2e/tour-guiado.spec.ts:4:3 › Tour guiado (driver.js) — espec 002 › el botón flotante de la guía se muestra en la página de inicio
[25/25] [chromium] › e2e/tour-guiado.spec.ts:13:3 › Tour guiado (driver.js) — espec 002 › la guía se oculta en rutas de autenticación
  25 passed (6.3s)
```

- **Antes**: 23 escenarios en verde (home, contacto, login bad path, RBAC admin).
- **Con el módulo AU**: 25 en verde, incluyendo los 2 nuevos del tour guiado.

## Contexto MCP

El server `playwright-mcp` (local, vía `npx`) permite que el agente controle el
navegador para *inspeccionar* el DOM cuando un localizador no coincide, en lugar
de adivinar selectores. Se habilita automáticamente al iniciar opencode
(requiere reiniciar opencode tras modificar `opencode.json`).

## Requisito AU cumplido

- Auto-generación de tests E2E desde spec-kit mediante IA ✅
- Ejecución y verificación de la suite completa en local ✅
- Integración con MCP (servidor de navegación/control del navegador) ✅
- Documentación del proceso de I/A (análisis de regresión y corrección) ✅