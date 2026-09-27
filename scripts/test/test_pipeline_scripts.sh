#!/usr/bin/env bash
set -euo pipefail

echo "==========================================="
echo "   INICIANDO SUITE DE PRUEBAS DEL PIPELINE "
echo "==========================================="

TOTAL_TESTS=5
PASSED=0

# 1. Prueba de idempotencia (setup repetido)
echo -n "Prueba 1: Idempotencia (prepare_env)... "
if bash scripts/setup/prepare_env.sh >/dev/null 2>&1 && bash scripts/setup/prepare_env.sh >/dev/null 2>&1; then
  echo "PASSED"
  ((PASSED++))
else
  echo "FAILED"
fi

# 2. Prueba de bloqueo por fallo (Gate)
echo -n "Prueba 2: Bloqueo por fallo (Integration Gate)... "
mkdir -p .tmp_bin
cat <<'EOF' > .tmp_bin/npm
#!/usr/bin/env bash
if [[ "$*" == *"lint"* ]]; then exit 1; fi
command npm "$@"
EOF
chmod +x .tmp_bin/npm
export PATH="$PWD/.tmp_bin:$PATH"
if ! bash scripts/ci/run_integration.sh >/dev/null 2>&1; then
  echo "PASSED"
  ((PASSED++))
else
  echo "FAILED"
fi
export PATH="${PATH#$PWD/.tmp_bin:}"
rm -rf .tmp_bin

# 3. Prueba de generación de artefacto
echo -n "Prueba 3: Generación de artefactos y checksums... "
bash scripts/release/build_release.sh >/dev/null 2>&1
if ls .release/goblinhub-*.tar.gz 1> /dev/null 2>&1 && ls .release/goblinhub-*.tar.gz.sha256 1> /dev/null 2>&1 && [ -f ".release/release-manifest.json" ]; then
  echo "PASSED"
  ((PASSED++))
else
  echo "FAILED"
fi

# 4. Prueba Healthcheck 200 OK
echo -n "Prueba 4: Deploy y Healthcheck (200 OK)... "
node -e "const http=require('http'); http.createServer((req,res)=>{res.writeHead(200);res.end('OK');}).listen(9999);" &
NODE_PID=$!
sleep 1
export ENVIRONMENT_NAME="test"
export HEALTHCHECK_URL="http://127.0.0.1:9999"
if bash scripts/deploy/deploy_and_verify.sh >/dev/null 2>&1; then
  echo "PASSED"
  ((PASSED++))
else
  echo "FAILED"
fi
kill $NODE_PID 2>/dev/null || true

# 5. Prueba Healthcheck Fail y Rollback
echo -n "Prueba 5: Deploy Fail y Rollback (404/500)... "
node -e "const http=require('http'); http.createServer((req,res)=>{res.writeHead(500);res.end('Error');}).listen(9998);" &
NODE_PID_FAIL=$!
sleep 1
export HEALTHCHECK_URL="http://127.0.0.1:9998"
export MAX_RETRIES=2
export SLEEP_SECONDS=1
export ROLLBACK_HOOK_URL="http://127.0.0.1:9999/mock_rollback"
if ! bash scripts/deploy/deploy_and_verify.sh >/dev/null 2>&1; then
  echo "PASSED"
  ((PASSED++))
else
  echo "FAILED"
fi
kill $NODE_PID_FAIL 2>/dev/null || true

echo "==========================================="
echo "   RESULTADO FINAL: $PASSED / $TOTAL_TESTS PRUEBAS"
echo "==========================================="
if [ "$PASSED" -ne "$TOTAL_TESTS" ]; then
  exit 1
fi
