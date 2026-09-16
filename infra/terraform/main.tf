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
    NODE_ENV          = "production"
    DATABASE_URL      = var.database_url
    REDIS_URL         = var.redis_url
    SUPABASE_URL      = supabase_project.goblinhub.database_url
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