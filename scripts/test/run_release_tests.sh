#!/usr/bin/env bash
set -euo pipefail

echo "==> Ejecutando pruebas en el entorno de liberación..."

echo "==> Pruebas de goblinhub-api..."
cd goblinhub-api
npm ci
npm run test
cd ..

echo "==> Pruebas de goblinhub_web..."
cd goblinhub_web
npm ci
npm run test
cd ..

echo "==> Todas las pruebas pasaron exitosamente. Entorno validado."
