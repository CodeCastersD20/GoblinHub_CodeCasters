# GoblinHub (CodeCasters) Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

Toda funcionalidad DEBE comenzar por sus pruebas: tests escritos y aprobados por
revisión antes de la implementación, bajo el ciclo Red-Green-Refactor. El backend
usa Jest + Supertest y el frontend Vitest + Testing Library + Playwright; los
cambios que no vayan acompañados de pruebas NO DEBEN fusionarse a `develop`.
Cobertura nueva o modificada DEBE cubrir los casos felices, los de error y las fronteras.

### II. Security-First

La seguridad es un requisito funcional, no un accesorio. Todo request privado DEBE
validar JWT (SupabaseAuthGuard) y autorización por rol (`admin` / `empleado` /
`jugador`) con RolesGuard. Los secrets (`SERVICE_KEY`, `JWT_SECRET`) NUNCA DEBEN
exponerse al cliente ni commitearse. Se aplican rate limits, Helmet, CORS por
whitelist y validación estricta de DTOs (`whitelist: true`). Los datos
destructivos usan soft-delete para auditoría. Vulnerabilidades conocidas DEBEN
resolverse con prioridad alta en su propia rama `sec/`.

### III. Type-Safe & Validated

TypeScript estricto en ambas capas, con `tsc --noEmit` en CI como gate. Prisma es
el modelo de datos único y type-safe; las migraciones se versionan con
`prisma migrate dev` y el esquema es la fuente de verdad. Toda entrada externa
DEBE validarse con `class-validator`. Está prohibido desactivar reglas de tipado
para evadir compilación.

### IV. Modular Single-Responsibility

El backend se organiza en módulos NestJS con una responsabilidad por módulo
(events, products, rewards, supabase, upload, backup, logs); el frontend separa
`pages`, `components` y `services`. Cada módulo DEBE tener un propósito claro,
sus propios tests y ser independiente de la lógica de los demás. No se crean
módulos "comodín" sin propósito definido.

### V. End-to-End Integration Verification

Cada feature DEBE verificarse como sistema completo, no solo en unidades:
contractos entre API y frontend, comunicación con servicios externos (Supabase
Auth, Storage, Redis, Google Maps) y esquemas compartidos. Se exigen pruebas E2E
funcionales (Playwright) y de API (Supertest) para cambios de contrato e
integración entre stacks. El estado de un flujo (p. ej. evento: programado → en
curso → finalizado) DEBE probarse de punta a punta.

## Additional Constraints: Technology Stack & Data Rules

El stack DEBE mantenerse dentro de la plataforma aprobada sin agregar frameworks
no versionados en este documento sin una enmienda:
- **Backend**: Node.js 18+, NestJS + TypeScript, Prisma, PostgreSQL (Supabase).
- **Frontend**: React 19 + TypeScript + Vite.
- **Auth/Storage**: Supabase Auth (JWT) y Supabase Storage.
- **Caché**: Redis (roles y sesiones); el cliente DEBE cachear roles validados.

Reglas de datos no negociables:
- Los secrets DEBEN vivir en `.env` y `.env.example` únicamente con placeholders.
- Toda mutación de esquema DEBE pasar por una migración de Prisma revisada.
- El borrado lógico (soft-delete) es la norma; el borrado físico requiere
  justificación documentada.
- Los backups de BD DEBEN generar y restaurar sin exponer credenciales en
  subprocesos ni logs.

## Development Workflow & Quality Gates

- Las ramas se nombran por tipo: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`,
  `ci/`, `chore/`, `perf/`, `sec/`, `infra/` — con id de issue cuando exista.
- Los commits DEBEN seguir Conventional Commits con scope, p. ej.
  `feat(events): ...`, `fix(auth): ...`.
- Toda integración entra por PR hacia `develop`; `main` recibe solo merges
  revisados desde `develop`.
- Gates de CI obligatorios antes del merge: lint (ESLint), type-check
  (`tsc --noEmit`), build, tests unitarios con cobertura y E2E (Playwright /
  Supertest). Localmente se replica con `npm run api` (backend) y `npm run web`
  (frontend).
- El PR DEBE llenar la plantilla: resumen, tipo de cambio, archivos afectados,
  cómo probarlo y checklist.
- La documentación `/docs` DEBE actualizarse cuando cambie un contrato
  (Swagger/OpenAPI) o una arquitectura.

## Governance

Esta constitución prevalece sobre cualquier otra práctica, script o costumbre del
repositorio. Las enmiendas DEBEN:
1. Documentarse en un PR que modifique este archivo, describiendo el motivo y el
   impacto sobre principios existentes.
2. Aprobarse por revisión del equipo CodeCasters antes del merge.
3. Incluir plan de migración si la enmienda cambia flujos en curso.

**Política de versionado** (SemVer): MAJOR para remociones o redefiniciones de
principios; MINOR para principios o secciones nuevas; PATCH para aclaraciones de
redacción. La versión, fecha de ratificación y última enmienda se registran en la
línea final de este documento.

Toda PR/revisión DEBE verificar el cumplimiento de estos principios antes de
aprobar. Las excepciones DEBEN justificarse explícitamente en el cuerpo del PR.
La guía de desarrollo en tiempo de ejecución es la establecida en `README.md` y
`docs/`.

**Version**: 1.0.0 | **Ratified**: 2026-09-11 | **Last Amended**: 2026-09-11