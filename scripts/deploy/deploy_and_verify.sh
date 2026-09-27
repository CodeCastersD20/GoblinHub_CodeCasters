#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DEPLOY_HOOK_URL:-}" ]] || [[ -z "${HEALTHCHECK_URL:-}" ]] || [[ -z "${ROLLBACK_HOOK_URL:-}" ]] || [[ -z "${RELEASE_VERSION:-}" ]] || [[ -z "${ENVIRONMENT_NAME:-}" ]]; then
  echo "Error: Faltan variables de entorno requeridas."
  exit 1
fi

echo "==> Desplegando versión ${RELEASE_VERSION} en ${ENVIRONMENT_NAME}..."

# Disparar deploy hook de Render de forma silenciosa para no imprimir logs sensibles
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_HOOK_URL")

if [[ "$HTTP_CODE" -lt 200 ]] || [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "Error: Fallo al disparar el Deploy Hook (HTTP $HTTP_CODE)."
  exit 1
fi

echo "==> Despliegue disparado. Verificando healthcheck (máx 30s)..."
MAX_RETRIES=6
RETRY_INTERVAL=5
HEALTH_OK=false

for ((i=1; i<=MAX_RETRIES; i++)); do
  echo "Verificando endpoint (Intento $i/$MAX_RETRIES)..."
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTHCHECK_URL" || echo "000")
  
  if [[ "$HEALTH_STATUS" == "200" ]]; then
    HEALTH_OK=true
    break
  fi
  sleep $RETRY_INTERVAL
done

if [[ "$HEALTH_OK" == "true" ]]; then
  echo "==> Despliegue Exitoso."
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "### ✅ Despliegue Exitoso: ${ENVIRONMENT_NAME}" >> $GITHUB_STEP_SUMMARY
    echo "| Entorno | Versión | Estado |" >> $GITHUB_STEP_SUMMARY
    echo "|---|---|---|" >> $GITHUB_STEP_SUMMARY
    echo "| **${ENVIRONMENT_NAME}** | \`${RELEASE_VERSION}\` | 🟩 Saludable (200 OK) |" >> $GITHUB_STEP_SUMMARY
  fi
else
  echo "==> Error: Healthcheck falló. Iniciando Rollback Automático..."
  curl -s -o /dev/null -X POST "$ROLLBACK_HOOK_URL"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    echo "### 🚨 Fallo de Despliegue y Rollback: ${ENVIRONMENT_NAME}" >> $GITHUB_STEP_SUMMARY
    echo "| Entorno | Versión | Estado | Acción |" >> $GITHUB_STEP_SUMMARY
    echo "|---|---|---|---|" >> $GITHUB_STEP_SUMMARY
    echo "| **${ENVIRONMENT_NAME}** | \`${RELEASE_VERSION}\` | 🟥 Falló | Rollback Disparado |" >> $GITHUB_STEP_SUMMARY
  fi
  exit 1
fi
