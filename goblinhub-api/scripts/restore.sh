#!/bin/bash
# GoblinHub — restauración segura de un backup public compatible.

set -euo pipefail
umask 077

if [ -z "${1:-}" ] || [ ! -f "$1" ]; then
  echo "❌ Uso: ./scripts/restore.sh <ruta/al/backup.sql>" >&2
  exit 1
fi
BACKUP_FILE="$1"
MANIFEST_FILE="$BACKUP_FILE.manifest.json"
HELPER="$(dirname "$0")/pg-secure-helper.cjs"

ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi
if [ -z "${RESTORE_DATABASE_URL:-}" ]; then
  echo "❌ Error: RESTORE_DATABASE_URL no está definida." >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: psql y node deben estar disponibles en PATH." >&2
  exit 1
fi

node "$HELPER" validate-manifest "$BACKUP_FILE" "$MANIFEST_FILE"

SECRET_DIR=$(mktemp -d "${TMPDIR:-/tmp}/goblinhub-pgpass.XXXXXX")
SAFE_URL_FILE="$SECRET_DIR/url"
PASSFILE="$SECRET_DIR/pgpass"
cleanup() { rm -rf -- "$SECRET_DIR"; }
trap cleanup EXIT HUP INT TERM

printf '%s' "$RESTORE_DATABASE_URL" | node "$HELPER" prepare "$SAFE_URL_FILE" "$PASSFILE"

unset BACKUP_DATABASE_URL DATABASE_URL RESTORE_DATABASE_URL PGPASSWORD
SAFE_URL=$(<"$SAFE_URL_FILE")
echo "⚠️  ADVERTENCIA: se restaurará $BACKUP_FILE en el esquema public."
read -rp "¿Deseas continuar? (s/N): " CONFIRM
[[ "$CONFIRM" == "s" || "$CONFIRM" == "S" ]] || { echo "Operación cancelada."; exit 0; }

env -i PATH="$PATH" HOME="${HOME:-}" LANG="${LANG:-C}" PGPASSFILE="$PASSFILE" \
  psql --dbname="$SAFE_URL" --no-password --file="$BACKUP_FILE" --single-transaction
echo "✅ Restauración completada exitosamente."
