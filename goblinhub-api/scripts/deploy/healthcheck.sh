#!/bin/bash
set -e
if [ -z "$HEALTHCHECK_URL" ]; then
  echo "Error: La variable HEALTHCHECK_URL no está definida."
  exit 1
fi
echo "Verificando salud en $HEALTHCHECK_URL..."
MAX_RETRIES=15
WAIT_SECONDS=10
for (( i=1; i<=MAX_RETRIES; i++ ))
do
  STATUS=$(curl -s -o /dev/null -w "\%{http_code}" "$HEALTHCHECK_URL" || true)
  if [ "$STATUS" -eq 200 ]; then
    echo "Servicio saludable (200 OK)."
    exit 0
  fi
  sleep $WAIT_SECONDS
done
exit 1
