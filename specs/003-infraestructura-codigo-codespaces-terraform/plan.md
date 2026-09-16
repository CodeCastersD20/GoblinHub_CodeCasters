# Implementation Plan: Infraestructura como Código (Codespaces + Terraform)

**Branch**: `infra/165-codespaces-terraform-iac` | **Date**: 2026-09-15 | **Spec**: `specs/003-infraestructura-codigo-codespaces-terraform/spec.md`

**Input**: Feature specification from `/specs/003-infraestructura-codigo-codespaces-terraform/spec.md`

## Summary

Entorno de desarrollo reproducible (Codespaces) + infraestructura como código con Terraform multi-proveedor para el despliegue de GoblinHub, documentado y validado (`terraform validate`), integrado al flujo CI/CD.

## Technical Context

**Language/Version**: Dockerfile (node:20-alpine paridad con `goblinhub-api/`), HCL (Terraform)

**Primary Dependencies**: GitHub Codespaces, `devcontainer` features, Terraform >= 1.5, proveedores `render-oss/render`, `supabase/supabase`, `hashicorp/aws`

**Storage**: servicios base de datos simulados en el devcontainer (postgres/redis opcionales)

**Testing**: `terraform validate` (estático, sin credenciales)

**Target Platform**: GitHub Codespaces (develop), Terraform (IaC)

**Project Type**: devcontainer + infra code

**Performance Goals**: apertura del Codespace < 3 min (imagen ligera)

**Constraints**: sin credenciales de nube en el repo; `apply` real fuera de alcance

**Scale/Scope**: 1 devcontainer + 1 módulo terraform (3 proveedores) + README

## Constitution Check

- **Principio II (Security-First)**: sin secrets en el repo; variables Terraform referencian `.env`/secrets de CI. Cumple.
- **Principio III (Type-Safe)**: infraestructura validada de forma declarativa (HCL). Aplica a flujo, no viola.
- **Principio IV (Modular)**: `.devcontainer/` e `infra/` con responsabilidad única. Cumple.
- Sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/003-infraestructura-codigo-codespaces-terraform/
├── spec.md
├── plan.md
└── tasks.md

root/
├── .devcontainer/
│   ├── devcontainer.json
│   └── Dockerfile
└── infra/
    ├── README.md
    └── terraform/
        ├── main.tf
        ├── variables.tf
        ├── outputs.tf
        └── terraform.tfstate (ignored / local)
```

### Source Code (repository root)

```text
.devcontainer/
├── devcontainer.json    # image node:20 + features + postCreateCommand
└── Dockerfile           # node:20, build-essential, git, cliente postgres/redis
infra/
├── README.md            # comandos y flujo CI/CD
└── terraform/
    ├── main.tf          # providers render/supabase/aws + recursos
    ├── variables.tf     # variables de entorno/secrets
    └── outputs.tf       # salidas (url, endpoints, bucket)
```

**Structure Decision**: IaC separada en `infra/terraform/` y entorno de desarrollo en `.devcontainer/` (convención estándar de GitHub).

## Complexity Tracking

No hay violaciones de complejidad que justificar.