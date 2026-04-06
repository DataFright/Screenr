#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-env.sh"

if ! server_is_reachable; then
  echo "Server not reachable at $BASE_URL"
  exit 1
fi

exec bash "$PROJECT_ROOT/tests/api/run-all-suites.sh"
