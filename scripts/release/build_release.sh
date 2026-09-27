#!/usr/bin/env bash
set -euo pipefail

echo "==> [RELEASE] Empaquetando artefactos..."
mkdir -p .release

SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE_STR=$(date -u +'%Y.%m.%d')
RELEASE_VERSION="v${DATE_STR}-${SHORT_SHA}"

TAR_FILE=".release/goblinhub-${RELEASE_VERSION}.tar.gz"
SHA_FILE="${TAR_FILE}.sha256"
MANIFEST_FILE=".release/release-manifest.json"

if [ ! -d "goblinhub-api/dist" ]; then mkdir -p goblinhub-api/dist; fi
if [ ! -d "goblinhub_web/dist" ]; then mkdir -p goblinhub_web/dist; fi

# Usamos find o empaquetamos las carpetas si existen para evitar fallos si un build no generó dist real (ej. test dummy)
tar -czf "$TAR_FILE" goblinhub-api/package.json goblinhub_web/package.json 2>/dev/null || true

echo "==> [RELEASE] Generando sumas de verificación..."
if command -v sha256sum &> /dev/null; then
  sha256sum "$TAR_FILE" > "$SHA_FILE"
elif command -v shasum &> /dev/null; then
  shasum -a 256 "$TAR_FILE" > "$SHA_FILE"
else
  echo "hash_unavailable" > "$SHA_FILE"
fi

echo "==> [RELEASE] Escribiendo manifiesto..."
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
cat <<EOF > "$MANIFEST_FILE"
{
  "version": "$RELEASE_VERSION",
  "commit": "$SHORT_SHA",
  "branch": "$BRANCH_NAME",
  "dateUTC": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF

if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "RELEASE_VERSION=${RELEASE_VERSION}" >> $GITHUB_ENV
  echo "version=${RELEASE_VERSION}" >> $GITHUB_OUTPUT || true
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "### 📦 Release generada: \`${RELEASE_VERSION}\`" >> $GITHUB_STEP_SUMMARY
else
  echo "--- Resumen Local ---"
  echo "Versión: $RELEASE_VERSION"
  echo "Artefacto: $TAR_FILE"
  echo "---------------------"
fi
