# Tasks: Infraestructura como Código (Codespaces + Terraform)

**Input**: Design documents from `/specs/003-infraestructura-codigo-codespaces-terraform/`

## Phase 1: Setup (Codespaces)

- [x] T001 Crear `.devcontainer/devcontainer.json` (imagen node:20 + features + postCreateCommand)
- [x] T002 Crear `.devcontainer/Dockerfile` (node:20, git, build-essential, clientes postgres/redis)
- [x] T003 Añadir comando de instalación (`npm install` en api y web) tras la creación del Codespace

**Checkpoint**: Codespace reproducible.

---

## Phase 2: Definición IaC (P2)

- [x] T004 Crear `infra/terraform/main.tf` con proveedores Render, Supabase y AWS S3
- [x] T005 Crear `infra/terraform/variables.tf` (referencias a secrets/env, sin valores)
- [x] T006 Crear `infra/terraform/outputs.tf` (URLs y endpoints resultantes)
- [x] T007 Añadir `.gitignore` para `*.tfstate`

**Checkpoint**: Terraform definido y validable.

---

## Phase 3: Documentación y CI (P3)

- [x] T008 Crear `infra/README.md` con comandos `terraform init/validate/plan/apply` y flujo CI/CD
- [x] T009 [P] Documentar en la Actividad 1.1 la liga de apoyo c) (issue #165 + PR)
- [x] T010 [P] Verificar que `terraform validate` pasa sin credenciales

**Checkpoint**: Feature completada (IaC validada y documentada).