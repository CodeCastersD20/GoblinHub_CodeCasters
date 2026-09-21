#!/bin/bash
set -e
echo "Iniciando proceso de build..."
npm ci
npm run build
echo "Build completado exitosamente."
