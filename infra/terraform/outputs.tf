# Salidas de la definición IaC de GoblinHub.
output "api_url" {
  description = "URL pública del servicio GoblinHub API (Render)."
  value       = render_web_service.goblinhub_api.url
}

output "supabase_project_ref" {
  description = "Referencia del proyecto Supabase (PostgreSQL)."
  value       = supabase_project.goblinhub.ref
}

output "backups_bucket" {
  description = "Bucket S3 donde se almacenan los respaldos de la base de datos."
  value       = aws_s3_bucket.goblinhub_backups.bucket
}