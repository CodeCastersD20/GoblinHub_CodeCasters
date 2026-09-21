#!/bin/bash
set -e
if [ -z "$RENDER_DEPLOY_HOOK_URL" ]; then
  echo "Error: La variable RENDER_DEPLOY_HOOK_URL no está definida."
  exit 1
fi
echo "Disparando Deploy Hook de Render..."
curl -s -X POST "$RENDER_DEPLOY_HOOK_URL"
echo -e "\nDespliegue disparado exitosamente."
