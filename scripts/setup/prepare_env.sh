#!/usr/bin/env bash
set -euo pipefail

echo "==> [SETUP] Preparando entorno de forma idempotente..."

# Verificación de prerrequisitos
for cmd in node npm git tar curl; do
  if ! command -v $cmd &> /dev/null; then
    echo "Error: El comando '$cmd' es requerido."
    exit 1
  fi
done

# Limpieza y preparación de directorios temporales
rm -rf .release/
mkdir -p .release/

echo "==> [SETUP] Instalando dependencias Backend..."
cd goblinhub-api
if [ -f package-lock.json ]; then npm ci; else npm install; fi
echo "==> [SETUP] Generando Prisma Client..."
npx prisma generate || true
cd ..

echo "==> [SETUP] Instalando dependencias Frontend..."
cd goblinhub_web
if [ -f package-lock.json ]; then npm ci; else npm install; fi
cd ..

echo "==> [SETUP] Entorno preparado correctamente."
