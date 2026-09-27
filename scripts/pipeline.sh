#!/usr/bin/env bash
set -euo pipefail

COMMAND=${1:-"all"}

run_stage() {
  local stage=$1
  case "$stage" in
    setup)       bash scripts/setup/prepare_env.sh ;;
    integration) bash scripts/ci/run_integration.sh ;;
    test)        bash scripts/test/run_release_tests.sh ;;
    release)     bash scripts/release/build_release.sh ;;
    deploy)      bash scripts/deploy/deploy_and_verify.sh development ;;
    *)           echo "Etapa desconocida: $stage"; exit 1 ;;
  esac
}

echo "====== ORQUESTADOR DE PIPELINE ======"
if [[ "$COMMAND" == "all" ]]; then
  run_stage setup
  run_stage integration
  run_stage test
  run_stage release
else
  run_stage "$COMMAND"
fi
echo "====== PIPELINE COMPLETADO ======"
