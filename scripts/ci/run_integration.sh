#!/usr/bin/env bash
set -euo pipefail

echo "==> [INTEGRATION] Ejecutando validaciones y compilación..."

echo "==> [API] Lint..."
cd goblinhub-api
npm run lint
echo "==> [API] Type-check..."
npx tsc --noEmit
echo "==> [API] Build..."
npm run build
cd ..

echo "==> [WEB] Lint..."
cd goblinhub_web
npm run lint
echo "==> [WEB] Type-check..."
npx tsc --noEmit
echo "==> [WEB] Build..."
npm run build
cd ..

echo "==> [INTEGRATION] Completado exitosamente. Todo en orden."
