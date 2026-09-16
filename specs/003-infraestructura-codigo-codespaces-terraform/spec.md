# Feature Specification: Infraestructura como Código (Codespaces + Terraform)

**Feature Branch**: `infra/165-codespaces-terraform-iac`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "/speckit.specify Piloto c) software como infraestructura: entorno reproducible con GitHub Codespaces (.devcontainer) y aprovisionamiento multi-proveedor con Terraform orientado a CI/CD."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entorno de desarrollo reproducible con Codespaces (Priority: P1)

Como desarrollador, puedo abrir el proyecto en un Codespace con Node 20, PostgreSQL y Redis configurados sin setup manual.

**Why this priority**: Es la brecha B11 detectada en la ingeniería inversa (`INGENIERIA_INVERSA.md`) y la base del onboarding sin fricción.

**Independent Test**: Abrir el repo en GitHub Codespaces y verificar que `node`, `psql` y `redis-cli` están disponibles y que `npm install` funciona en `goblinhub-api/` y `goblinhub_web/`.

**Acceptance Scenarios**:

1. **Given** el archivo `.devcontainer/devcontainer.json`, **When** se crea un Codespace, **Then** se construye la imagen con Node 20 y las herramientas declaradas.
2. **Given** un Codespace activo, **When** se ejecuta `npx prisma generate` en `goblinhub-api/`, **Then** se genera el cliente Prisma sin errores.

---

### User Story 2 - Definición IaC multi-proveedor con Terraform (Priority: P2)

Como administrador, la infraestructura (hosting Render, identidad Supabase y storage de respaldos) queda descrita como código en `infra/terraform/`.

**Why this priority**: Convierte el despliegue en reproducible y auditable (liga de apoyo **c)**), precondición de pipelines CI/CD declarativos.

**Independent Test**: `terraform init` y `terraform validate` en `infra/terraform/` se ejecutan sin errores (sin requerir credenciales).

**Acceptance Scenarios**:

1. **Given** `infra/terraform/` con `main.tf`, `variables.tf`, `outputs.tf`, **When** se ejecuta `terraform validate`, **Then** la configuración compila y referencia proveedores válidos.
2. **Given** las variables de entorno, **When** se ejecuta `terraform plan`, **Then** se muestra el plan de recursos a crear.

---

### User Story 3 - Documentación de uso e integración CI/CD (Priority: P3)

Como equipo, existe documentación de cómo usar el Codespace y el flujo `terraform plan/apply` dentro de los pipelines.

**Why this priority**: Asegura que la definición IaC sea *usable*, no solo decorativa, y se integra con el flujo de control de versiones.

**Independent Test**: `infra/README.md` describe los comandos exactos y su uso en el flujo de trabajo Git + GitHub Actions.

**Acceptance Scenarios**:

1. **Given** `infra/README.md`, **When** se lee, **Then** incluye comandos de inicialización, validación y despliegue.
2. **Given** el flujo CI/CD documentado, **When** se integra, **Then** se explica el rol de la definición IaC en el despliegue a Render.

### Edge Cases

- ¿Qué pasa si no hay credenciales de nube? → la validación (`terraform validate`) no las exige; `apply` queda documentado.
- ¿Y si el Codespace no necesita Redis en local? → el compose expone el servicio opcional.
- ¿Compatibilidad con el stack? → imagen `node:20` para backend y frontend.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: DEBE existir `.devcontainer/devcontainer.json` con la definición del Codespace.
- **FR-002**: DEBE existir un `Dockerfile` (o compose) con Node 20 y herramientas de BD (postgres/redis client).
- **FR-003**: DEBE existir `infra/terraform/main.tf` con proveedores representativos multi-proveedor (Render, Supabase, storage S3).
- **FR-004**: Terraform DEBE pasar `terraform validate` sin credenciales.
- **FR-005**: DEBE existir `infra/README.md` con los comandos de uso.
- **FR-006**: La definición IaC DEBE alinearse con el pipeline `web.yml`/`api.yml` y Dockerfile existente de `goblinhub-api/`.

### Key Entities

- **devcontainer.json**: definición del Codespace (Node 20 + features).
- **Terraform**: proveedores `render-oss/render`, `supabase/supabase`, `hashicorp/aws` (S3).
- **Dockerfile (api)**: ya existente en `goblinhub-api/` (PR #144).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `terraform validate` sin errores (n=1 módulo).
- **SC-002**: Documentación IaC incluida en la Actividad 1.1 (liga c) con su issue y PR.
- **SC-003**: El Codespace se puede abrir con 1 clic y la app compila.

## Assumptions

- No se ejecuta `terraform apply` real sin credenciales ni presupuesto en la nube; la entrega es la definición como código validada.
- Los proveedores usados existen en el registry público de Terraform.
- El despliegue productivo real continúa en Render (actualmente en operación).