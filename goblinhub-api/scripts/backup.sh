#!/bin/bash
# GoblinHub — respaldo seguro del esquema public.

set -euo pipefail
umask 077

ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

if [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  echo "❌ Error: BACKUP_DATABASE_URL no está definida." >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: pg_dump y node deben estar disponibles en PATH." >&2
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
MANIFEST_FILE="$BACKUP_FILE.manifest.json"
SECRET_DIR=$(mktemp -d "${TMPDIR:-/tmp}/goblinhub-pgpass.XXXXXX")
SAFE_URL_FILE="$SECRET_DIR/url"
PASSFILE="$SECRET_DIR/pgpass"
HELPER="$(dirname "$0")/pg-secure-helper.cjs"
cleanup() {
  rm -rf -- "$SECRET_DIR"
}
trap cleanup EXIT HUP INT TERM

printf '%s' "$BACKUP_DATABASE_URL" | node "$HELPER" prepare "$SAFE_URL_FILE" "$PASSFILE"

unset BACKUP_DATABASE_URL DATABASE_URL RESTORE_DATABASE_URL PGPASSWORD
SAFE_URL=$(<"$SAFE_URL_FILE")

echo "🔄 Iniciando respaldo del esquema public..."
echo "   Destino: $BACKUP_FILE"

if ! env -i PATH="$PATH" HOME="${HOME:-}" LANG="${LANG:-C}" PGPASSFILE="$PASSFILE" \
  pg_dump --dbname="$SAFE_URL" --no-password --format=plain --no-owner \
  --no-acl --schema=public --file="$BACKUP_FILE"; then
  rm -f -- "$BACKUP_FILE" "$MANIFEST_FILE"
  exit 1
fi

node "$HELPER" create-manifest "$BACKUP_FILE" "$MANIFEST_FILE"

echo "✅ Respaldo completado: $BACKUP_FILE"
echo "   Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"
