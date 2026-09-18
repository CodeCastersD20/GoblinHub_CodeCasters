# Variables de la definición IaC de GoblinHub.
# Los valores se inyectan desde secrets del CI/CD o el entorno (nunca se versionan).
variable "project_slug" {
  description = "Sufijo único para nombres de recursos (p. ej. goblinhub)."
  type        = string
  default     = "goblinhub"
}

variable "render_api_key" {
  description = "API key de Render (secret)."
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Access token de Supabase (secret)."
  type        = string
  sensitive   = true
}

variable "supabase_org_id" {
  description = "ID de la organización de Supabase."
  type        = string
}

variable "supabase_database_password" {
  description = "Contraseña de la base de datos Supabase (secret)."
  type        = string
  sensitive   = true
}

variable "databases_url" {
  description = "Cadena de conexión PostgreSQL (1:1 con Supabase)."
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Cadena de conexión PostgreSQL principal (Supabase)."
  type        = string
  sensitive   = true
}

variable "redis_url" {
  description = "Cadena de conexión Redis (cache de roles/perfil)."
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "Región AWS para el bucket de respaldos."
  type        = string
  default     = "us-east-1"
}