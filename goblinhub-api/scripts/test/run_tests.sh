#!/bin/bash
set -e
echo "Ejecutando pruebas en el entorno de liberación..."
npm run test
echo "Todas las pruebas pasaron."
