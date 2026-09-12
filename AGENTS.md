# AGENTS.md — Reglas del equipo (CodeCasters)

Reglas de trabajo para agentes y desarrolladores en **GoblinHub**. El lenguaje
oficial del repo es español.

## Flujo de trabajo GitHub (SIEMPRE)

Todo cambio en este repositorio DEBE seguir este flujo:

1. **Crear una issue** antes de escribir código, usando la plantilla de
   `/.github/ISSUE_TEMPLATE/` que corresponda al tipo (`.yml`):
   - `01-FEATURE-FORM.yml` para funcionalidad
   - `20-BUG-REPORT.yml` para bugs
   - `40-DOCS-FORM.yml` para documentación
   - `50-PERF-FORM.yml`, `60-REFACTOR-FORM.yml`, `70-TEST-FORM.yml`,
     `10-CHORE-FORM.yml`, `30-CI-FORM.yml` según el caso
   - Title con prefijo del tipo, p. ej. `[Docs]: <título>`.
2. **Crear la rama a partir de la issue**, desde `develop`, con la misma
   estructura de las ramas existentes: `<tipo>/<id-de-la-issue>-<slug>`.
   - Ejemplos: `docs/154-ratificar-constitucion-spec-kit`,
     `feat/100-dashboard-de-administrador-crear-nuevos-eventos`,
     `fix/34-bug-idor-en-putdelete-eventsid-sin-verificación-de-propietario`.
   - Tipos válidos: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `ci/`,
     `chore/`, `perf/`, `sec/`, `infra/`.
3. **Commit con Conventional Commits** e idioma español, scope incluido:
   `feat(events): ...`, `fix(auth): ...`, `docs(SDK): ...`.
4. **Crear el PR hacia `develop`** usando la plantilla de
   `/.github/pull_request_template.md` (o `/.github/PULL_REQUEST_TEMPLATE/`),
   completando resumen, tipo de cambio, archivos afectados, cómo probarlo y el
   checklist.
   - Etiquetar el PR con la(s) misma(s) etiqueta(s) de la issue, añadiendo la de
     tipo: p. ej. docs → `documentation` + `Feature`.
5. **Vincular rama y PR a la issue**: el PR DEBE incluir la cláusula de cierre,
   p. ej. `Closes #<id>` (keyword en inglés para cierre automático), y la issue
   DEBE actualizarse indicando la rama y el PR asociados.
6. **Solicitar revisión**: tras crear el PR, DEBE solicitarse la revisión del
   equipo (request review). No se mergea sin aprobación.

## Reglas de ramas y PRs

- La rama raíz de integración es `develop`; `main` recibe solo merges revisados.
- Todo PR requiere revisión del equipo antes del merge: `REVIEW_REQUIRED` hasta
  que un revisor apruebe.
- Las etiquetas del PR DEBEN reflejar el tipo de cambio y replicar las de la
  issue vinculada.
- Los archivos de configuración de GitHub (`.github/workflows/*.yml`, plantillas)
  se modifican SOLO por PRs revisados.
- No hacer push directo a `develop` ni `main`.

## Stack y convenciones (resumen)

- Backend: NestJS + TypeScript + Prisma + PostgreSQL (Supabase).
- Frontend: React 19 + TypeScript + Vite.
- Auth: Supabase Auth (JWT) + Redis para caché de roles.
- Tests: Jest + Supertest (API), Vitest + Testing Library + Playwright (UI).
- Gates de CI obligatorios: lint, `tsc --noEmit`, build, cobertura, E2E.
- Desarrollo dirigido por especificaciones (Spec Kit): ver `/speckit.specify`,
  `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`.
- Los principios y gobernanza del proyecto viven en
  `.specify/memory/constitution.md` y prevalecen sobre esta guía.