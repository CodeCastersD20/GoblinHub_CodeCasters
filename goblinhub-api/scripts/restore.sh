#!/bin/bash
# =============================================================
# GoblinHub — Script de Restauración de Base de Datos
# Uso: ./scripts/restore.sh <ruta/al/archivo/backup.sql>
# Requiere: psql instalado y variable DATABASE_URL en .env
# =============================================================

set -euo pipefail

# Validar argumento
if [ -z "${1:-}" ]; then
  echo "❌ Error: Debes especificar el archivo de backup a restaurar."
  echo "   Uso: ./scripts/restore.sh <ruta/al/backup.sql>"
  echo ""
  echo "   Ejemplo: ./scripts/restore.sh backups/backup_2026-02-27_10-00-00.sql"
  exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: No se encontró el archivo '$BACKUP_FILE'."
  echo "   Verifica la ruta e intenta de nuevo."
  exit 1
fi

# Cargar variables del archivo .env si existe
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
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

# Verificar que psql esté disponible
if ! command -v psql &> /dev/null; then
  echo "❌ Error: 'psql' no está instalado o no está en el PATH."
  echo "   Instálalo con: sudo apt install postgresql-client  (Ubuntu/Debian)"
  echo "                  brew install libpq                   (macOS)"
  exit 1
fi

echo "⚠️  ADVERTENCIA: Esta operación sobreescribirá datos existentes en la base de datos."
echo "   Base de datos destino: $DATABASE_URL"
echo "   Archivo de respaldo:   $BACKUP_FILE"
echo ""
read -rp "¿Deseas continuar? (s/N): " CONFIRM

if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
  echo "Operación cancelada."
  exit 0
fi

echo ""
echo "🔄 Iniciando restauración desde: $BACKUP_FILE"

psql \
  --dbname="$DATABASE_URL" \
  --no-password \
  --file="$BACKUP_FILE" \
  --single-transaction

echo ""
echo "✅ Restauración completada exitosamente."
