#!/usr/bin/env bash
set -euo pipefail

echo "==> [TEST] Ejecutando suite de pruebas automatizadas..."

echo "==> [API] Tests..."
cd goblinhub-api
npm run test
cd ..

echo "==> [WEB] Tests..."
cd goblinhub_web
npm run test
cd ..

echo "==> [TEST] Todas las pruebas pasaron."
