# Infraestructura como Código de GoblinHub (multi-proveedor).
# Actividad 1.1 - liga de apoyo c) "Software como infraestructura ... terraform (multivendor-cloud) -> CICD".
# Definición representativa y validable con `terraform validate` (no requiere credenciales).
terraform {
  required_version = ">= 1.5"
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.6"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
}

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "aws" {
  region = var.aws_region
}

# --- Hosting: Render (despliegue web + api) ---
resource "render_web_service" "goblinhub_api" {
  name      = "goblinhub-api"
  plan      = "starter"
  region    = "oregon"
  runtime   = "docker"
  repo_url  = "https://github.com/CodeCastersD20/GoblinHub_CodeCasters"
  branch    = "develop"
  root_dir  = "goblinhub-api"
  docker_context = "goblinhub-api"
  health_check_path = "/healthz"
  auto_deploy = true

  env_vals = {
    NODE_ENV                  = "production"
    DATABASE_URL              = var.database_url
    REDIS_URL                 = var.redis_url
    SUPABASE_URL              = supabase_project.goblinhub.database_url

    # Variables de la #214. Sin `DEPLOY_ENV` la API arranca con el valor por
    # defecto `development`, y entonces todas las reglas de producción filtran
    # por `deployment_environment="production"` y no encuentran ninguna serie:
    # el sistema queda en verde con la alerta muda.
    DEPLOY_ENV                = "production"

    # Límite del pool de Prisma, que alimenta M-11 y la alerta A-06. Debe
    # coincidir con lo que admita Supabase; si el pool del backend es mayor que
    # el de la base de datos, la saturación aparece como A-10 y no como A-06.
    DATABASE_POOL_MAX         = var.database_pool_max

    # El arranque falla sin la service role key: `SupabaseService` la exige al
    # construir el cliente. Sin estas dos variables, el contenedor muere en el
    # HEALTHCHECK y `auto_deploy` no levanta nada.
    SUPABASE_ANON_KEY         = var.supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
  }
}

# --- Identidad/Base de datos: Supabase (PostgreSQL) ---
resource "supabase_project" "goblinhub" {
  organization_id   = var.supabase_org_id
  name              = "goblinhub"
  database_password = var.supabase_database_password
  region            = "us-east-1"
}

# --- Storage de respaldos: AWS S3 ---
resource "aws_s3_bucket" "goblinhub_backups" {
  bucket = "goblinhub-backups-${var.project_slug}"
}

resource "aws_s3_bucket_versioning" "goblinhub_backups" {
  bucket = aws_s3_bucket.goblinhub_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}