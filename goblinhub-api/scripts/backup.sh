#!/bin/bash
# =============================================================
# GoblinHub — Script de Respaldo de Base de Datos
# Uso: ./scripts/backup.sh
# Requiere: pg_dump instalado y variable DATABASE_URL en .env
# =============================================================

set -euo pipefail

# Cargar variables del archivo .env si existe
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  # Exporta solo las líneas que no son comentarios y no están vacías
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

# Validar que DATABASE_URL esté definida
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: La variable DATABASE_URL no está definida."
  echo "   Asegúrate de tener un archivo .env con DATABASE_URL configurado."
  exit 1
fi

# Verificar que pg_dump esté disponible
if ! command -v pg_dump &> /dev/null; then
  echo "❌ Error: 'pg_dump' no está instalado o no está en el PATH."
  echo "   Instálalo con: sudo apt install postgresql-client  (Ubuntu/Debian)"
  echo "                  brew install libpq                   (macOS)"
  exit 1
fi

# Crear carpeta de backups si no existe
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

# Generar nombre de archivo con timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

echo "🔄 Iniciando respaldo de la base de datos..."
echo "   Destino: $BACKUP_FILE"

# Ejecutar pg_dump usando la DATABASE_URL completa
# --no-password evita el prompt interactivo (la contraseña viaja en la URL)
# --format=plain genera un archivo SQL legible y restaurable con psql
pg_dump \
  --dbname="$DATABASE_URL" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-acl \
  --file="$BACKUP_FILE"

echo "✅ Respaldo completado exitosamente."
echo "   Archivo: $BACKUP_FILE"
echo "   Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"
