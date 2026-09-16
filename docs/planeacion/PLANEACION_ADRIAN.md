# PR de planeación — Adrián Eduardo Santos Rosales (@AdrianS-127)

> **Rol en el equipo**: infraestructura (Docker/despliegue) y pruebas E2E de
> seguridad (bad path del login).

## 1. Ticket / Issue

- **Issue #158** — `[Test]: Pruebas E2E (Playwright) para el "bad path" del
  login` <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/158>
- **Issue #140** — `[Infra] Integrar Dockerfile, Health Check y Logs
  estructurados`
  <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/140>
- **Issue #139** — `[Infra] Ocultar contraseña de Base de Datos en subprocesos
  de backup` <https://github.com/CodeCastersD20/GoblinHub_CodeCasters/issues/139>
- **Issue #157** — `[Docs] Actualizar documentación (seguimiento spec-kit e
  infraestructura como código)`

## 2. Código elaborado (documentación y markdowns)

- **PR #159** — Pruebas E2E del bad path del login (`goblinhub_web/e2e/login-bad-path.spec.ts`).
- **PR #144** — `Dockerfile` multi-stage (node:20-alpine), `HEALTHCHECK` contra
  `/health` y logs de acceso en JSON (estrategia de despliegue, sección 5).
- **PR #145** — `.pgpass` temporal para ocultar la contraseña en backup/restore.
- **PR #157** — Actualización de documentación SDD/spec-kit e infraestructura
  como código.

## 3. Uso

- `docker build` + `docker run` reproducen el backend; `HEALTHCHECK` valida el
  estado; los logs JSON alimentan la monitorización en Render.
- El bad path del login valida la UX de error de autenticación en CI.