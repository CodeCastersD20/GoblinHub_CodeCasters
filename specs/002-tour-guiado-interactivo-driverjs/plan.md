# Implementation Plan: Tour guiado interactivo (driver.js)

**Branch**: `feat/164-specs-spec-kit-para-modulos-piloto` | **Date**: 2026-09-15 | **Spec**: `specs/002-tour-guiado-interactivo-driverjs/spec.md`

**Input**: Feature specification from `/specs/002-tour-guiado-interactivo-driverjs/spec.md`

## Summary

Implementar una guía interactiva de primer uso en el frontend con `driver.js`: auto-arranque en la primera visita a `/`, botón flotante `?` para repetirlo y tours contextuales por ruta. Cubre la liga de apoyo **b)** de la Actividad 1.1 (https://driverjs.com).

## Technical Context

**Language/Version**: TypeScript (React 19 + Vite)

**Primary Dependencies**: `driver.js` (^1.8.0)

**Storage**: `localStorage` (clave `gh_guided_tour_done`)

**Testing**: Vitest + Testing Library (`guideTour.test.tsx`)

**Target Platform**: Navegador (Chromium en E2E)

**Project Type**: web-app (frontend `goblinhub_web/`)

**Performance Goals**: sin impacto medible en el bundle principal (el tour solo se monta y arranca bajo demanda)

**Constraints**: `skipMissingElement: true`; no interferir con `TOUR_HIDDEN_PATHS`

**Scale/Scope**: 1 componente + 1 hoja de estilos + 1 test unitario + montaje en App

## Constitution Check

- **Principio IV (Modular Single-Responsibility)**: componente autocontenido en `components/guideTour/`; cumple.
- **Principio I (Test-First)**: prueba unitaria Vitest incluida; cumple.
- Sin violaciones: no agrega frameworks fuera del stack aprobado.

## Project Structure

### Documentation (this feature)

```text
specs/002-tour-guiado-interactivo-driverjs/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
goblinhub_web/
├── src/
│   ├── App.tsx                                # monta <GuideTour/>
│   └── components/guideTour/
│       ├── guideTour.tsx                      # componente + STEPS + CONFIG
│       ├── guideTour.css                      # estilos del popover y botón
│       └── guideTour.test.tsx                 # tests Vitest
└── package.json                               # dependency driver.js
```

**Structure Decision**: Directorio `components/guideTour/` autocontenido (estilos, lógica y tests juntos), alineado con la estructura de componentes del repo.

## Complexity Tracking

No hay violaciones de complejidad que justificar.