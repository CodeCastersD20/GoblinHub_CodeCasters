# PR de planeación — Sadrach Juan Diego Garcia Flores (@Sadrach34)

> **Rol en el equipo**: coordinación técnica, infraestructura de pruebas,
> RBAC y documentación SDD/spec-kit.

## 1. Ticket / Issue

- **Issue #115** — `[feat/test]: Infraestructura de pruebas automatizadas
  (Vitest + Playwright) y página de confirmación de cuenta`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/115>
- **Issue #160** — `[feat]: Tour guiado con driver.js e ingeniería inversa del
  sistema` <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/160>
- **Issue #154** — `[Docs]: Ratificar la Constitución del proyecto (Spec Kit)`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/154>
- **Issue #164** — `[Docs]: Generar specs spec-kit de módulos piloto`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/164>

## 2. Código elaborado (documentación y markdowns)

- **PR #116** — Infraestructura de pruebas (Vitest + Playwright) y página de
  confirmación de cuenta.
- **PR #155** — Ratifica la **Constitución v1.0.0** (Spec Kit):
  `.specify/memory/constitution.md`.
- **PR #161** — Tour guiado **driver.js** (`GuideTour`) + **ingeniería inversa**
  `docs/INGENIERIA_INVERSA.md` (ER Mermaid, trazabilidad, análisis, brechas).
- **PR #169** — Specs/planes/tareas de Spec Kit de los módulos piloto a/b/c y
  casos de prueba (`specs/`, issue #164).

## 3. Uso

- `docs/INGENIERIA_INVERSA.md` es el punto de partida para diagnosticar el
  sistema y priorizar mejoras (brechas B1–B11).
- Los comandos `/speckit.specify`, `/speckit.plan` y `/speckit.tasks` generan los
  artefactos de `specs/` para especificar features antes de codificar.