#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT_NAME=${ENVIRONMENT_NAME:-${1:-""}}
if [[ -z "$ENVIRONMENT_NAME" ]]; then
  echo "Uso: $0 [development|staging|production]"
  exit 1
fi

DEPLOY_HOOK_URL=${DEPLOY_HOOK_URL:-""}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-""}
ROLLBACK_HOOK_URL=${ROLLBACK_HOOK_URL:-""}
RELEASE_VERSION=${RELEASE_VERSION:-"latest"}
MAX_RETRIES=${MAX_RETRIES:-6}
SLEEP_SECONDS=${SLEEP_SECONDS:-5}

echo "==> [DEPLOY] Entorno: ${ENVIRONMENT_NAME}, Versión: ${RELEASE_VERSION}"

if [[ -z "$DEPLOY_HOOK_URL" ]]; then
  echo "==> [DEPLOY] (Simulación Local) DEPLOY_HOOK_URL no provisto."
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_HOOK_URL")
  if [[ "$HTTP_CODE" -lt 200 ]] || [[ "$HTTP_CODE" -ge 400 ]]; then
    echo "Error: Deploy Hook falló (HTTP $HTTP_CODE)."
    exit 1
  fi
fi

if [[ -z "$HEALTHCHECK_URL" ]]; then
  echo "==> [DEPLOY] (Simulación Local) HEALTHCHECK_URL no provisto."
  HEALTH_OK=true
else
  echo "==> [DEPLOY] Verificando salud en endpoint (máx $MAX_RETRIES reintentos)..."
  HEALTH_OK=false
  for ((i=1; i<=MAX_RETRIES; i++)); do
    echo "Intento $i/$MAX_RETRIES..."
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTHCHECK_URL" || echo "000")
    if [[ "$HEALTH_STATUS" == "200" ]]; then
      HEALTH_OK=true
      break
    fi
    sleep $SLEEP_SECONDS
  done
fi

if [[ "$HEALTH_OK" == "true" ]]; then
  echo "==> [DEPLOY] Despliegue Exitoso."
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "### ✅ Despliegue Exitoso: ${ENVIRONMENT_NAME}" >> $GITHUB_STEP_SUMMARY
  fi
else
  echo "==> [DEPLOY] Error: Healthcheck falló. Iniciando Rollback..."
  if [[ -n "$ROLLBACK_HOOK_URL" ]]; then
    curl -s -o /dev/null -X POST "$ROLLBACK_HOOK_URL" || true
  fi
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "### 🚨 Fallo de Despliegue y Rollback: ${ENVIRONMENT_NAME}" >> $GITHUB_STEP_SUMMARY
  fi
  exit 1
fi
