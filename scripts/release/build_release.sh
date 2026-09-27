#!/usr/bin/env bash
set -euo pipefail

echo "==> Iniciando build_release.sh"

SHORT_SHA=$(git rev-parse --short HEAD)
DATE_STR=$(date +'%Y.%m.%d')
RELEASE_VERSION="v${DATE_STR}-${SHORT_SHA}"

# Exportar la variable para que los siguientes steps de GitHub Actions puedan usarla
echo "RELEASE_VERSION=${RELEASE_VERSION}" >> $GITHUB_ENV || true
echo "==> Versión generada: ${RELEASE_VERSION}"

echo "==> Validando compilación: goblinhub-api"
cd goblinhub-api
npm ci
npx prisma generate || true
npm run build
cd ..

echo "==> Validando compilación: goblinhub_web"
cd goblinhub_web
npm ci
npm run build
cd ..

echo "==> Empaquetando artefactos para la versión ${RELEASE_VERSION}..."
mkdir -p release_artifacts
tar -czf release_artifacts/goblinhub-api.tar.gz -C goblinhub-api dist package.json package-lock.json
tar -czf release_artifacts/goblinhub_web.tar.gz -C goblinhub_web dist package.json package-lock.json

echo "==> ¡Entorno de liberación generado y empaquetado exitosamente!"
