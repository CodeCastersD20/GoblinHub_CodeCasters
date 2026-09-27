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

variable "database_pool_max" {
  description = <<-EOT
    Máximo de conexiones del pool de Prisma en la API. Lo publica la métrica
    M-11 (goblinhub_prisma_pool_connections_max) y lo usa la alerta A-06 para
    detectar saturación. Debe ser menor que el límite de conexiones de
    Supabase: si el backend pide más de las que la base de datos concede, la
    saturación se manifiesta como dependencia caída (A-10) en lugar de como
    pool lleno (A-06), y el diagnóstico lleva a reiniciar en vez de a
    ajustar el pool.
  EOT
  type        = number
  default     = 10
}

variable "supabase_anon_key" {
  description = "Clave anon de Supabase. La exige SupabaseService al arrancar."
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = <<-EOT
    Service role key de Supabase. Sin ella el contenedor no arranca:
    SupabaseService lanza en el factory y el HEALTHCHECK nunca pasa.
  EOT
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "Región AWS para el bucket de respaldos."
  type        = string
  default     = "us-east-1"
}