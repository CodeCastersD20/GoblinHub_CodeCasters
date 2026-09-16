# Infraestructura como Código de GoblinHub

Cubre la liga de apoyo **c)** de la Actividad 1.1: *Software como infraestructura*
— entorno reproducible con **GitHub Codespaces** (`.devcontainer/`) y
aprovisionamiento **multi-proveedor** con **Terraform** (`infra/terraform/`)
orientado a CI/CD.

| Proveedor | Recurso | Rol |
|---|---|---|
| Render (`render-oss/render`) | `goblinhub-api` (web service, Docker) | Hosting público del backend |
| Supabase (`supabase/supabase`) | Proyecto PostgreSQL | Identidad + base de datos |
| AWS (`hashicorp/aws`) | Bucket S3 `goblinhub-backups` | Almacenamiento de respaldos |

## 1. GitHub Codespaces (entorno local reproducible)

Abre el repo y crea un Codespace (botón *Code → Codespaces*). El contenedor
`node:20-bookworm` incluye Node 20, `psql`, `redis-cli`, `openssl` y `build-essential`.

```bash
# Alias de ayuda definidos en .devcontainer/.bashrc
api        # npm run start:dev  → goblinhub-api en :3000
web        # npm run dev        → goblinhub_web en :5173
gprisma    # npx prisma ...     → cliente Prisma del backend
lint-web   # lint frontend
e2e        # npm run test:e2e   → Playwright (Chromium)
```

Tras crear el Codespace se ejecuta `npm install` en ambos paquetes
(`postCreateCommand` de `devcontainer.json`).

> Prerequisitos de la app: variables de entorno (`DATABASE_URL`, `REDIS_URL`,
> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET`) — consulta los `.env.example`
> de `goblinhub-api/` y `goblinhub_web/`.

## 2. Terraform (multi-proveedor → CI/CD)

```bash
cd infra/terraform

terraform init          # descarga proveedores del registry
terraform fmt -check    # formato consistente
terraform validate      # valida sintaxis/referencias (no requiere credenciales)
terraform plan          # muestra el plan de recursos (requiere secrets)
terraform apply         # aplica el plan (solo con credenciales)
```

### Integración propuesta con CI/CD

- **CI (GitHub Actions)**: job `terraform validate` para cualquier cambio en
  `infra/**` (barrera de calidad como `api.yml`/`web.yml`).
- **CD**: disparar `terraform apply` en un entorno aprobado usando secrets del
  repositorio (`RENDER_API_KEY`, `SUPABASE_ACCESS_TOKEN`, `AWS_ACCESS_KEY_ID`, …).
- La definición IaC describe el **mismo** despliegue que operan hoy los
  pipelines (`web.yml` build/e2e y despliegue en Render), de forma declarativa.

> **Nota académica/seguridad**: los secrets nunca se versionan; `terraform validate`
> no requiere credenciales. El `apply` real queda fuera del alcance de la
> Actividad 1.1 (evidencia = definición IaC validada y documentada).

## 3. Relación con el repositorio

- `goblinhub-api/Dockerfile` — paridad con la imagen de producción (multi-stage, PR #144).
- `.github/workflows/*.yml` — pipelines de CI que validan antes de despliegue.
- `specs/003-infraestructura-codigo-codespaces-terraform/` — spec/plan/tasks de Spec Kit.